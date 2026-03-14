package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object Invoices : Table("invoices") {
    val id = varchar("id", 64)
    val orgId = varchar("org_id", 64).references(Organizations.id)
    val invoiceNumber = varchar("invoice_number", 50)
    val contactId = varchar("contact_id", 64).references(Contacts.id).nullable()
    val type = varchar("type", 30) // invoice, bill, credit_note, debit_note
    val status = varchar("status", 30) // draft, sent, partially_paid, paid, overdue, cancelled
    val issueDate = varchar("issue_date", 20)
    val dueDate = varchar("due_date", 20)
    val subtotal = decimal("subtotal", 15, 2).default(java.math.BigDecimal.ZERO)
    val discountAmount = decimal("discount_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val taxAmount = decimal("tax_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val totalAmount = decimal("total_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val amountPaid = decimal("amount_paid", 15, 2).default(java.math.BigDecimal.ZERO)
    val amountDue = decimal("amount_due", 15, 2).default(java.math.BigDecimal.ZERO)
    val currency = varchar("currency", 3).default("INR")
    val notes = text("notes").nullable()
    val terms = text("terms").nullable()
    val placeOfSupply = varchar("place_of_supply", 100).nullable()
    val reverseCharge = bool("reverse_charge").default(false)
    val syncedAt = datetime("synced_at").nullable()
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())
    val isDeleted = bool("is_deleted").default(false)

    override val primaryKey = PrimaryKey(id)
}
