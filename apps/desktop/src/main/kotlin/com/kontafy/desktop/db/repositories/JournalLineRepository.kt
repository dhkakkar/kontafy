package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.JournalLineModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.JournalLines
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq

class JournalLineRepository {

    fun getAll(): List<JournalLineModel> = dbQuery {
        JournalLines.selectAll().map { it.toJournalLineModel() }
    }

    fun getById(id: String): JournalLineModel? = dbQuery {
        JournalLines.selectAll().where { JournalLines.id eq id }
            .map { it.toJournalLineModel() }
            .singleOrNull()
    }

    fun getByOrgId(orgId: String): List<JournalLineModel> = dbQuery {
        // Journal lines don't have orgId directly; return all for now
        JournalLines.selectAll().map { it.toJournalLineModel() }
    }

    fun create(model: JournalLineModel): JournalLineModel = dbQuery {
        JournalLines.insert {
            it[id] = model.id
            it[entryId] = model.entryId
            it[accountId] = model.accountId
            it[debitAmount] = model.debitAmount
            it[creditAmount] = model.creditAmount
            it[description] = model.description
        }
        model
    }

    fun update(model: JournalLineModel): Boolean = dbQuery {
        JournalLines.update({ JournalLines.id eq model.id }) {
            it[entryId] = model.entryId
            it[accountId] = model.accountId
            it[debitAmount] = model.debitAmount
            it[creditAmount] = model.creditAmount
            it[description] = model.description
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        JournalLines.deleteWhere { JournalLines.id eq id } > 0
    }

    fun search(query: String): List<JournalLineModel> = dbQuery {
        JournalLines.selectAll().where {
            JournalLines.description like "%$query%"
        }.map { it.toJournalLineModel() }
    }

    fun getByEntry(entryId: String): List<JournalLineModel> = dbQuery {
        JournalLines.selectAll().where { JournalLines.entryId eq entryId }
            .map { it.toJournalLineModel() }
    }

    fun deleteByEntry(entryId: String): Int = dbQuery {
        JournalLines.deleteWhere { JournalLines.entryId eq entryId }
    }

    fun upsert(model: JournalLineModel): JournalLineModel = dbQuery {
        val existing = JournalLines.selectAll().where { JournalLines.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toJournalLineModel() = JournalLineModel(
        id = this[JournalLines.id],
        entryId = this[JournalLines.entryId],
        accountId = this[JournalLines.accountId],
        debitAmount = this[JournalLines.debitAmount],
        creditAmount = this[JournalLines.creditAmount],
        description = this[JournalLines.description],
    )
}
