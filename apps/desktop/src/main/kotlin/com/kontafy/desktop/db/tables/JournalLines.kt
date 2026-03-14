package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table

object JournalLines : Table("journal_lines") {
    val id = varchar("id", 64)
    val entryId = varchar("entry_id", 64).references(JournalEntries.id)
    val accountId = varchar("account_id", 64).references(Accounts.id)
    val debitAmount = decimal("debit_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val creditAmount = decimal("credit_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val description = text("description").nullable()

    override val primaryKey = PrimaryKey(id)
}
