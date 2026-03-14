package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object Payments : Table("payments") {
    val id = varchar("id", 64)
    val orgId = varchar("org_id", 64).references(Organizations.id)
    val invoiceId = varchar("invoice_id", 64).references(Invoices.id).nullable()
    val contactId = varchar("contact_id", 64).references(Contacts.id).nullable()
    val amount = decimal("amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val paymentDate = varchar("payment_date", 20)
    val method = varchar("method", 20) // cash, bank, upi, cheque, card
    val reference = varchar("reference", 100).nullable()
    val notes = text("notes").nullable()
    val type = varchar("type", 20) // received, made
    val syncedAt = datetime("synced_at").nullable()
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)
}
