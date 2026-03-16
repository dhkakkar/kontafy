package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.InvoiceModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.Invoices
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.like
import java.time.LocalDateTime

class InvoiceRepository {

    fun getAll(): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where { Invoices.isDeleted eq false }
            .orderBy(Invoices.issueDate to SortOrder.DESC)
            .map { it.toInvoiceModel() }
    }

    fun getById(id: String): InvoiceModel? = dbQuery {
        Invoices.selectAll().where { (Invoices.id eq id) and (Invoices.isDeleted eq false) }
            .map { it.toInvoiceModel() }
            .singleOrNull()
    }

    fun getByOrgId(orgId: String): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where {
            (Invoices.orgId eq orgId) and (Invoices.isDeleted eq false)
        }.orderBy(Invoices.issueDate to SortOrder.DESC)
            .map { it.toInvoiceModel() }
    }

    fun create(model: InvoiceModel): InvoiceModel = dbQuery {
        val resolvedType = inferType(model.type, model.invoiceNumber)
        Invoices.insert {
            it[id] = model.id
            it[orgId] = model.orgId
            it[invoiceNumber] = model.invoiceNumber
            it[contactId] = model.contactId
            it[type] = resolvedType
            it[status] = model.status
            it[issueDate] = model.issueDate
            it[dueDate] = model.dueDate
            it[subtotal] = model.subtotal
            it[discountAmount] = model.discountAmount
            it[taxAmount] = model.taxAmount
            it[totalAmount] = model.totalAmount
            it[amountPaid] = model.amountPaid
            it[amountDue] = model.amountDue
            it[currency] = model.currency
            it[notes] = model.notes
            it[terms] = model.terms
            it[placeOfSupply] = model.placeOfSupply
            it[reverseCharge] = model.reverseCharge
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
            it[isDeleted] = model.isDeleted
        }
        model
    }

    fun update(model: InvoiceModel): Boolean = dbQuery {
        val resolvedType = inferType(model.type, model.invoiceNumber)
        Invoices.update({ Invoices.id eq model.id }) {
            it[invoiceNumber] = model.invoiceNumber
            it[contactId] = model.contactId
            it[type] = resolvedType
            it[status] = model.status
            it[issueDate] = model.issueDate
            it[dueDate] = model.dueDate
            it[subtotal] = model.subtotal
            it[discountAmount] = model.discountAmount
            it[taxAmount] = model.taxAmount
            it[totalAmount] = model.totalAmount
            it[amountPaid] = model.amountPaid
            it[amountDue] = model.amountDue
            it[currency] = model.currency
            it[notes] = model.notes
            it[terms] = model.terms
            it[placeOfSupply] = model.placeOfSupply
            it[reverseCharge] = model.reverseCharge
            it[syncedAt] = model.syncedAt
            it[updatedAt] = LocalDateTime.now()
            it[isDeleted] = model.isDeleted
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        Invoices.update({ Invoices.id eq id }) {
            it[isDeleted] = true
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    fun search(query: String): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where {
            (Invoices.isDeleted eq false) and (
                (Invoices.invoiceNumber like "%$query%") or
                    (Invoices.notes like "%$query%")
                )
        }.orderBy(Invoices.issueDate to SortOrder.DESC)
            .map { it.toInvoiceModel() }
    }

    fun getByStatus(orgId: String, status: String): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where {
            (Invoices.orgId eq orgId) and (Invoices.status eq status) and (Invoices.isDeleted eq false)
        }.orderBy(Invoices.issueDate to SortOrder.DESC)
            .map { it.toInvoiceModel() }
    }

    fun getByContact(contactId: String): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where {
            (Invoices.contactId eq contactId) and (Invoices.isDeleted eq false)
        }.orderBy(Invoices.issueDate to SortOrder.DESC)
            .map { it.toInvoiceModel() }
    }

    fun getNextNumber(orgId: String, prefix: String = "INV"): String = dbQuery {
        val allNumbers = Invoices.selectAll().where {
            (Invoices.orgId eq orgId) and (Invoices.isDeleted eq false) and
                (Invoices.invoiceNumber like "$prefix-%")
        }.map { it[Invoices.invoiceNumber] }

        val maxSeq = allNumbers.mapNotNull { num ->
            num.substringAfterLast("-").toIntOrNull()
        }.maxOrNull() ?: 0

        "$prefix-${(maxSeq + 1).toString().padStart(4, '0')}"
    }

    fun getOverdue(orgId: String, currentDate: String): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where {
            (Invoices.orgId eq orgId) and
                (Invoices.isDeleted eq false) and
                (Invoices.status neq "paid") and
                (Invoices.status neq "cancelled") and
                (Invoices.dueDate less currentDate)
        }.orderBy(Invoices.dueDate to SortOrder.ASC)
            .map { it.toInvoiceModel() }
    }

    fun upsert(model: InvoiceModel): InvoiceModel = dbQuery {
        val existing = Invoices.selectAll().where { Invoices.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    /**
     * Infer the correct document type from the invoice number prefix.
     * Handles legacy data where all records were stored with type="invoice".
     */
    private fun inferType(storedType: String, invoiceNumber: String): String {
        val upper = invoiceNumber.uppercase()
        return when {
            upper.startsWith("QT-") || upper.startsWith("QT_") -> "quotation"
            upper.startsWith("PO-") || upper.startsWith("PO_") -> "purchase_order"
            upper.startsWith("INV-") || upper.startsWith("INV_") -> "invoice"
            else -> storedType
        }
    }

    private fun ResultRow.toInvoiceModel(): InvoiceModel {
        val storedType = this[Invoices.type]
        val number = this[Invoices.invoiceNumber]
        return InvoiceModel(
        id = this[Invoices.id],
        orgId = this[Invoices.orgId],
        invoiceNumber = number,
        contactId = this[Invoices.contactId],
        type = inferType(storedType, number),
        status = this[Invoices.status],
        issueDate = this[Invoices.issueDate],
        dueDate = this[Invoices.dueDate],
        subtotal = this[Invoices.subtotal],
        discountAmount = this[Invoices.discountAmount],
        taxAmount = this[Invoices.taxAmount],
        totalAmount = this[Invoices.totalAmount],
        amountPaid = this[Invoices.amountPaid],
        amountDue = this[Invoices.amountDue],
        currency = this[Invoices.currency],
        notes = this[Invoices.notes],
        terms = this[Invoices.terms],
        placeOfSupply = this[Invoices.placeOfSupply],
        reverseCharge = this[Invoices.reverseCharge],
        syncedAt = this[Invoices.syncedAt],
        updatedAt = this[Invoices.updatedAt],
        isDeleted = this[Invoices.isDeleted],
    )
    }
}
