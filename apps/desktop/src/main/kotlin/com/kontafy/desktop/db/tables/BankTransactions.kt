package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object BankTransactions : Table("bank_transactions") {
    val id = varchar("id", 64)
    val bankAccountId = varchar("bank_account_id", 64).references(BankAccounts.id, onDelete = ReferenceOption.CASCADE)
    val date = varchar("date", 20)
    val description = varchar("description", 500)
    val reference = varchar("reference", 100).default("")
    val debit = decimal("debit", 15, 2).default(java.math.BigDecimal.ZERO)
    val credit = decimal("credit", 15, 2).default(java.math.BigDecimal.ZERO)
    val balance = decimal("balance", 15, 2).default(java.math.BigDecimal.ZERO)
    val isReconciled = bool("is_reconciled").default(false)
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val syncedAt = datetime("synced_at").nullable()
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)

    init {
        index(isUnique = false, bankAccountId)
        index(isUnique = false, date)
    }
}
