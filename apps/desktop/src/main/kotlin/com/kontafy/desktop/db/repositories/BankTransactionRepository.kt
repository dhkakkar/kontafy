package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.BankTransactionModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.BankTransactions
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDateTime

class BankTransactionRepository {

    fun getByBankAccountId(bankAccountId: String): List<BankTransactionModel> = dbQuery {
        BankTransactions.selectAll().where { BankTransactions.bankAccountId eq bankAccountId }
            .orderBy(BankTransactions.date to SortOrder.DESC)
            .map { it.toBankTransactionModel() }
    }

    fun create(model: BankTransactionModel): BankTransactionModel = dbQuery {
        BankTransactions.insert {
            it[id] = model.id
            it[bankAccountId] = model.bankAccountId
            it[date] = model.date
            it[description] = model.description
            it[reference] = model.reference
            it[debit] = model.debit
            it[credit] = model.credit
            it[balance] = model.balance
            it[isReconciled] = model.isReconciled
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
        }
        model
    }

    fun upsert(model: BankTransactionModel): BankTransactionModel = dbQuery {
        val existing = BankTransactions.selectAll().where { BankTransactions.id eq model.id }.singleOrNull()
        if (existing != null) {
            BankTransactions.update({ BankTransactions.id eq model.id }) {
                it[date] = model.date
                it[description] = model.description
                it[reference] = model.reference
                it[debit] = model.debit
                it[credit] = model.credit
                it[balance] = model.balance
                it[isReconciled] = model.isReconciled
                it[syncedAt] = model.syncedAt
                it[updatedAt] = LocalDateTime.now()
            }
            model
        } else {
            create(model)
        }
    }

    fun deleteByBankAccountId(bankAccountId: String): Int = dbQuery {
        BankTransactions.deleteWhere { BankTransactions.bankAccountId eq bankAccountId }
    }

    private fun ResultRow.toBankTransactionModel() = BankTransactionModel(
        id = this[BankTransactions.id],
        bankAccountId = this[BankTransactions.bankAccountId],
        date = this[BankTransactions.date],
        description = this[BankTransactions.description],
        reference = this[BankTransactions.reference],
        debit = this[BankTransactions.debit],
        credit = this[BankTransactions.credit],
        balance = this[BankTransactions.balance],
        isReconciled = this[BankTransactions.isReconciled],
        syncedAt = this[BankTransactions.syncedAt],
        updatedAt = this[BankTransactions.updatedAt],
    )
}
