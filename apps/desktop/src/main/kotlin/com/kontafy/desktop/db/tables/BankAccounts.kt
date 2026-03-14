package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object BankAccounts : Table("bank_accounts") {
    val id = varchar("id", 64)
    val orgId = varchar("org_id", 64).references(Organizations.id)
    val bankName = varchar("bank_name", 255)
    val accountNumber = varchar("account_number", 30)
    val ifscCode = varchar("ifsc_code", 11).nullable()
    val accountType = varchar("account_type", 20) // savings, current, od
    val balance = decimal("balance", 15, 2).default(java.math.BigDecimal.ZERO)
    val isActive = bool("is_active").default(true)
    val syncedAt = datetime("synced_at").nullable()
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)
}
