package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object Contacts : Table("contacts") {
    val id = varchar("id", 64)
    val orgId = varchar("org_id", 64).references(Organizations.id)
    val name = varchar("name", 255)
    val type = varchar("type", 20) // customer, vendor, both
    val email = varchar("email", 255).nullable()
    val phone = varchar("phone", 20).nullable()
    val gstin = varchar("gstin", 15).nullable()
    val pan = varchar("pan", 10).nullable()
    val billingAddress = text("billing_address").nullable()
    val shippingAddress = text("shipping_address").nullable()
    val city = varchar("city", 100).nullable()
    val state = varchar("state", 100).nullable()
    val stateCode = varchar("state_code", 10).nullable()
    val pincode = varchar("pincode", 10).nullable()
    val creditLimit = decimal("credit_limit", 15, 2).default(java.math.BigDecimal.ZERO)
    val outstandingBalance = decimal("outstanding_balance", 15, 2).default(java.math.BigDecimal.ZERO)
    val isActive = bool("is_active").default(true)
    val syncedAt = datetime("synced_at").nullable()
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)
}
