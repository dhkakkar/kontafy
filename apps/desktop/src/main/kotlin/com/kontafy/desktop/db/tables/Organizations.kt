package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object Organizations : Table("organizations") {
    val id = varchar("id", 64)
    val name = varchar("name", 255)
    val gstin = varchar("gstin", 15).nullable()
    val pan = varchar("pan", 10).nullable()
    val address = text("address").nullable()
    val city = varchar("city", 100).nullable()
    val state = varchar("state", 100).nullable()
    val stateCode = varchar("state_code", 10).nullable()
    val pincode = varchar("pincode", 10).nullable()
    val phone = varchar("phone", 20).nullable()
    val email = varchar("email", 255).nullable()
    val logo = text("logo").nullable()
    val invoicePrefix = varchar("invoice_prefix", 20).nullable()
    val financialYearStart = varchar("financial_year_start", 10).nullable()
    val settings = text("settings").nullable() // JSON
    val syncedAt = datetime("synced_at").nullable()
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)
}
