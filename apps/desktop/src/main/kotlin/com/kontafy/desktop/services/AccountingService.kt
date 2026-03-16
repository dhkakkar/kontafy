package com.kontafy.desktop.services

import com.kontafy.desktop.api.*
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.repositories.*
import java.math.BigDecimal
import java.util.UUID

/**
 * Service that handles transactional business operations:
 * - Invoice creation with line items (atomic)
 * - Payment recording with invoice/contact balance updates (atomic)
 * - Auto-creation of journal entries for double-entry bookkeeping
 * - Invoice deletion with cascade cleanup
 */
class AccountingService(
    private val invoiceRepository: InvoiceRepository = InvoiceRepository(),
    private val invoiceItemRepository: InvoiceItemRepository = InvoiceItemRepository(),
    private val paymentRepository: PaymentRepository = PaymentRepository(),
    private val contactRepository: ContactRepository = ContactRepository(),
    private val journalEntryRepository: JournalEntryRepository = JournalEntryRepository(),
    private val journalLineRepository: JournalLineRepository = JournalLineRepository(),
    private val accountRepository: AccountRepository = AccountRepository(),
    private val auditLogRepository: AuditLogRepository = AuditLogRepository(),
    private val productRepository: ProductRepository = ProductRepository(),
) {

    /**
     * Create invoice + line items + journal entry in a single transaction.
     */
    fun createInvoiceWithItems(
        invoice: InvoiceModel,
        items: List<InvoiceItemModel>,
    ): InvoiceModel = dbQuery {
        // 1. Create invoice
        invoiceRepository.create(invoice)

        // 2. Create all line items
        items.forEach { item ->
            invoiceItemRepository.create(item)
        }

        // 3. Update contact outstanding balance (for sales invoices)
        if (invoice.type == "invoice" && invoice.contactId != null) {
            val contact = contactRepository.getById(invoice.contactId)
            if (contact != null) {
                contactRepository.update(
                    contact.copy(outstandingBalance = contact.outstandingBalance + invoice.totalAmount)
                )
            }
        }

        // 4. Auto-create journal entry for sales invoices
        if (invoice.type == "invoice") {
            createInvoiceJournalEntry(invoice)
        }

        // 5. Auto-decrease stock for sales invoices
        if (invoice.type == "invoice") {
            val products = productRepository.getByOrgId(invoice.orgId)
            items.forEach { item ->
                val product = if (item.productId != null) {
                    products.find { it.id == item.productId }
                } else {
                    products.find { it.name.equals(item.description, ignoreCase = true) }
                }
                if (product != null) {
                    val oldStock = product.stockQuantity
                    val newStock = (oldStock - item.quantity).coerceAtLeast(BigDecimal.ZERO)
                    productRepository.update(product.copy(stockQuantity = newStock))
                    auditLog(
                        orgId = invoice.orgId,
                        entityType = "product",
                        entityId = product.id,
                        action = "STOCK_SOLD",
                        description = "Stock decreased from Invoice ${invoice.invoiceNumber}: -${item.quantity.toPlainString()} ${product.name}",
                        fieldChanged = "stockQuantity",
                        oldValue = oldStock.toPlainString(),
                        newValue = newStock.toPlainString(),
                    )
                }
            }
        }

        // 6. Audit trail
        val entityType = if (invoice.type == "purchase_order") "purchase_order" else "invoice"
        val label = if (invoice.type == "purchase_order") "Purchase Order" else "Invoice"
        auditLog(
            orgId = invoice.orgId,
            entityType = entityType,
            entityId = invoice.id,
            action = "CREATED",
            description = "$label ${invoice.invoiceNumber} created. Amount: ${invoice.totalAmount.toPlainString()}",
        )

        invoice
    }

    /**
     * Update an existing invoice and its line items atomically.
     */
    fun updateInvoiceWithItems(
        invoice: InvoiceModel,
        items: List<InvoiceItemModel>,
    ): InvoiceModel = dbQuery {
        // 1. Get old invoice to compute balance diff
        val oldInvoice = invoiceRepository.getById(invoice.id)

        // 2. Update the invoice
        invoiceRepository.update(invoice)

        // 3. Delete old line items and re-create
        invoiceItemRepository.deleteByInvoice(invoice.id)
        items.forEach { item ->
            invoiceItemRepository.create(item)
        }

        // 4. Adjust contact outstanding balance if amount changed
        if (invoice.type == "invoice" && invoice.contactId != null && oldInvoice != null) {
            val diff = invoice.totalAmount - oldInvoice.totalAmount
            if (diff != BigDecimal.ZERO) {
                val contact = contactRepository.getById(invoice.contactId)
                if (contact != null) {
                    contactRepository.update(
                        contact.copy(outstandingBalance = contact.outstandingBalance + diff)
                    )
                }
            }
        }

        // 5. Audit trail
        val entityType = if (invoice.type == "purchase_order") "purchase_order" else "invoice"
        val label = if (invoice.type == "purchase_order") "Purchase Order" else "Invoice"
        auditLog(
            orgId = invoice.orgId,
            entityType = entityType,
            entityId = invoice.id,
            action = "UPDATED",
            description = "$label ${invoice.invoiceNumber} updated.",
            fieldChanged = if (oldInvoice != null && oldInvoice.totalAmount != invoice.totalAmount) "totalAmount" else null,
            oldValue = oldInvoice?.totalAmount?.toPlainString(),
            newValue = invoice.totalAmount.toPlainString(),
        )

        invoice
    }

    /**
     * Record a payment and update invoice/contact balances atomically.
     */
    fun recordPayment(
        payment: PaymentModel,
    ): PaymentModel = dbQuery {
        // 1. Save payment
        paymentRepository.create(payment)

        val paidAmount = payment.amount

        // 2. Update contact outstanding balance
        payment.contactId?.let { contactId ->
            val contact = contactRepository.getById(contactId)
            if (contact != null) {
                val newBalance = if (payment.type == "received") {
                    contact.outstandingBalance - paidAmount
                } else {
                    contact.outstandingBalance + paidAmount
                }
                contactRepository.update(contact.copy(outstandingBalance = newBalance))
            }
        }

        // 3. Update linked invoice amountPaid/amountDue
        payment.invoiceId?.let { invId ->
            val invoice = invoiceRepository.getById(invId)
            if (invoice != null) {
                val newPaid = invoice.amountPaid + paidAmount
                val newDue = (invoice.totalAmount - newPaid).coerceAtLeast(BigDecimal.ZERO)
                val newStatus = if (newDue <= BigDecimal.ZERO) "PAID" else invoice.status
                invoiceRepository.update(invoice.copy(
                    amountPaid = newPaid,
                    amountDue = newDue,
                    status = newStatus,
                ))
            }
        }

        // 4. Auto-create journal entry for payment
        createPaymentJournalEntry(payment)

        // 5. Audit trail
        auditLog(
            orgId = payment.orgId,
            entityType = "payment",
            entityId = payment.id,
            action = "CREATED",
            description = "Payment ${payment.type} of ${payment.amount.toPlainString()} via ${payment.method}. Ref: ${payment.reference ?: "N/A"}",
        )

        payment
    }

    /**
     * Delete an invoice and clean up related data atomically.
     */
    fun deleteInvoice(invoiceId: String) = dbQuery {
        val invoice = invoiceRepository.getById(invoiceId)

        // 1. Delete line items
        invoiceItemRepository.deleteByInvoice(invoiceId)

        // 2. Reverse contact balance if it was a sales invoice
        if (invoice != null && invoice.type == "invoice" && invoice.contactId != null) {
            val contact = contactRepository.getById(invoice.contactId)
            if (contact != null) {
                val reverseAmount = invoice.amountDue // Only reverse unpaid portion
                contactRepository.update(
                    contact.copy(outstandingBalance = contact.outstandingBalance - reverseAmount)
                )
            }
        }

        // 3. Soft-delete the invoice
        invoiceRepository.delete(invoiceId)

        // 4. Audit trail
        if (invoice != null) {
            val entityType = if (invoice.type == "purchase_order") "purchase_order" else "invoice"
            val label = if (invoice.type == "purchase_order") "Purchase Order" else "Invoice"
            auditLog(
                orgId = invoice.orgId,
                entityType = entityType,
                entityId = invoiceId,
                action = "DELETED",
                description = "$label ${invoice.invoiceNumber} deleted. Amount was ${invoice.totalAmount.toPlainString()}",
            )
        }
    }

    /**
     * Create a DR Accounts Receivable / CR Sales Revenue journal entry for an invoice.
     */
    private fun createInvoiceJournalEntry(invoice: InvoiceModel) {
        val entryId = UUID.randomUUID().toString()
        val receivableAccountId = findOrCreateAccount(invoice.orgId, "Accounts Receivable", "asset")
        val revenueAccountId = findOrCreateAccount(invoice.orgId, "Sales Revenue", "income")

        journalEntryRepository.create(JournalEntryModel(
            id = entryId,
            orgId = invoice.orgId,
            entryNumber = "JE-${invoice.invoiceNumber}",
            date = invoice.issueDate,
            narration = "Sales invoice ${invoice.invoiceNumber}",
            type = "auto",
            referenceType = "invoice",
            referenceId = invoice.id,
            isPosted = true,
        ))

        // DR Accounts Receivable
        journalLineRepository.create(JournalLineModel(
            id = UUID.randomUUID().toString(),
            entryId = entryId,
            accountId = receivableAccountId,
            debitAmount = invoice.totalAmount,
            creditAmount = BigDecimal.ZERO,
            description = "Invoice ${invoice.invoiceNumber}",
        ))

        // CR Sales Revenue
        journalLineRepository.create(JournalLineModel(
            id = UUID.randomUUID().toString(),
            entryId = entryId,
            accountId = revenueAccountId,
            debitAmount = BigDecimal.ZERO,
            creditAmount = invoice.subtotal,
            description = "Revenue from ${invoice.invoiceNumber}",
        ))

        // CR Tax Liability (if tax > 0)
        if (invoice.taxAmount > BigDecimal.ZERO) {
            val taxAccountId = findOrCreateAccount(invoice.orgId, "GST Payable", "liability")
            journalLineRepository.create(JournalLineModel(
                id = UUID.randomUUID().toString(),
                entryId = entryId,
                accountId = taxAccountId,
                debitAmount = BigDecimal.ZERO,
                creditAmount = invoice.taxAmount,
                description = "Tax on ${invoice.invoiceNumber}",
            ))
        }

        // Update account balances
        updateAccountBalance(receivableAccountId, invoice.totalAmount)
        updateAccountBalance(revenueAccountId, invoice.subtotal)
        if (invoice.taxAmount > BigDecimal.ZERO) {
            val taxAccountId = findOrCreateAccount(invoice.orgId, "GST Payable", "liability")
            updateAccountBalance(taxAccountId, invoice.taxAmount)
        }
    }

    /**
     * Create a DR Bank/Cash / CR Accounts Receivable journal entry for a payment received,
     * or DR Accounts Payable / CR Bank/Cash for a payment made.
     */
    private fun createPaymentJournalEntry(payment: PaymentModel) {
        val entryId = UUID.randomUUID().toString()

        val cashAccountId = if (payment.method.lowercase() in listOf("cash")) {
            findOrCreateAccount(payment.orgId, "Cash", "asset")
        } else {
            findOrCreateAccount(payment.orgId, "Bank", "asset")
        }

        if (payment.type == "received") {
            val receivableAccountId = findOrCreateAccount(payment.orgId, "Accounts Receivable", "asset")

            journalEntryRepository.create(JournalEntryModel(
                id = entryId,
                orgId = payment.orgId,
                entryNumber = "JE-PMT-${payment.id.takeLast(6)}",
                date = payment.paymentDate,
                narration = "Payment received - ${payment.reference ?: payment.method}",
                type = "auto",
                referenceType = "payment",
                referenceId = payment.id,
                isPosted = true,
            ))

            // DR Cash/Bank
            journalLineRepository.create(JournalLineModel(
                id = UUID.randomUUID().toString(),
                entryId = entryId,
                accountId = cashAccountId,
                debitAmount = payment.amount,
                creditAmount = BigDecimal.ZERO,
                description = "Payment received",
            ))

            // CR Accounts Receivable
            journalLineRepository.create(JournalLineModel(
                id = UUID.randomUUID().toString(),
                entryId = entryId,
                accountId = receivableAccountId,
                debitAmount = BigDecimal.ZERO,
                creditAmount = payment.amount,
                description = "Payment received",
            ))

            updateAccountBalance(cashAccountId, payment.amount)
            updateAccountBalance(receivableAccountId, -payment.amount)
        } else {
            val payableAccountId = findOrCreateAccount(payment.orgId, "Accounts Payable", "liability")

            journalEntryRepository.create(JournalEntryModel(
                id = entryId,
                orgId = payment.orgId,
                entryNumber = "JE-PMT-${payment.id.takeLast(6)}",
                date = payment.paymentDate,
                narration = "Payment made - ${payment.reference ?: payment.method}",
                type = "auto",
                referenceType = "payment",
                referenceId = payment.id,
                isPosted = true,
            ))

            // DR Accounts Payable
            journalLineRepository.create(JournalLineModel(
                id = UUID.randomUUID().toString(),
                entryId = entryId,
                accountId = payableAccountId,
                debitAmount = payment.amount,
                creditAmount = BigDecimal.ZERO,
                description = "Payment made",
            ))

            // CR Cash/Bank
            journalLineRepository.create(JournalLineModel(
                id = UUID.randomUUID().toString(),
                entryId = entryId,
                accountId = cashAccountId,
                debitAmount = BigDecimal.ZERO,
                creditAmount = payment.amount,
                description = "Payment made",
            ))

            updateAccountBalance(payableAccountId, -payment.amount)
            updateAccountBalance(cashAccountId, -payment.amount)
        }
    }

    /**
     * Find an account by name, or create it if it doesn't exist.
     */
    private fun findOrCreateAccount(orgId: String, name: String, type: String): String {
        val existing = accountRepository.getByType(orgId, type)
            .find { it.name.equals(name, ignoreCase = true) }
        if (existing != null) return existing.id

        val id = UUID.randomUUID().toString()
        accountRepository.create(AccountModel(
            id = id,
            orgId = orgId,
            code = generateAccountCode(type),
            name = name,
            type = type,
            isGroup = false,
        ))
        return id
    }

    private fun generateAccountCode(type: String): String {
        val prefix = when (type) {
            "asset" -> "1"
            "liability" -> "2"
            "equity" -> "3"
            "income" -> "4"
            "expense" -> "5"
            else -> "9"
        }
        return "$prefix${System.currentTimeMillis() % 10000}"
    }

    private fun updateAccountBalance(accountId: String, amount: BigDecimal) {
        val account = accountRepository.getById(accountId)
        if (account != null) {
            accountRepository.update(
                account.copy(currentBalance = account.currentBalance + amount)
            )
        }
    }

    private fun auditLog(
        orgId: String,
        entityType: String,
        entityId: String,
        action: String,
        description: String,
        fieldChanged: String? = null,
        oldValue: String? = null,
        newValue: String? = null,
    ) {
        try {
            auditLogRepository.create(
                AuditLogEntry(
                    orgId = orgId,
                    entityType = entityType,
                    entityId = entityId,
                    action = action,
                    fieldChanged = fieldChanged,
                    oldValue = oldValue,
                    newValue = newValue,
                    description = description,
                ),
            )
        } catch (e: Exception) {
            // Audit logging should never break the main operation
            e.printStackTrace()
        }
    }
}
