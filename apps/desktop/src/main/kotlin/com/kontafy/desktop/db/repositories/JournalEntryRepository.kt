package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.JournalEntryModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.JournalEntries
import com.kontafy.desktop.db.tables.JournalLines
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.like
import java.time.LocalDateTime

class JournalEntryRepository {

    fun getAll(): List<JournalEntryModel> = dbQuery {
        JournalEntries.selectAll()
            .orderBy(JournalEntries.date to SortOrder.DESC)
            .map { it.toJournalEntryModel() }
    }

    fun getById(id: String): JournalEntryModel? = dbQuery {
        JournalEntries.selectAll().where { JournalEntries.id eq id }
            .map { it.toJournalEntryModel() }
            .singleOrNull()
    }

    fun getByOrgId(orgId: String): List<JournalEntryModel> = dbQuery {
        JournalEntries.selectAll().where { JournalEntries.orgId eq orgId }
            .orderBy(JournalEntries.date to SortOrder.DESC)
            .map { it.toJournalEntryModel() }
    }

    fun create(model: JournalEntryModel): JournalEntryModel = dbQuery {
        JournalEntries.insert {
            it[id] = model.id
            it[orgId] = model.orgId
            it[entryNumber] = model.entryNumber
            it[date] = model.date
            it[narration] = model.narration
            it[type] = model.type
            it[referenceType] = model.referenceType
            it[referenceId] = model.referenceId
            it[isPosted] = model.isPosted
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
        }
        model
    }

    fun update(model: JournalEntryModel): Boolean = dbQuery {
        JournalEntries.update({ JournalEntries.id eq model.id }) {
            it[entryNumber] = model.entryNumber
            it[date] = model.date
            it[narration] = model.narration
            it[type] = model.type
            it[referenceType] = model.referenceType
            it[referenceId] = model.referenceId
            it[isPosted] = model.isPosted
            it[syncedAt] = model.syncedAt
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        JournalEntries.deleteWhere { JournalEntries.id eq id } > 0
    }

    fun search(query: String): List<JournalEntryModel> = dbQuery {
        JournalEntries.selectAll().where {
            (JournalEntries.entryNumber like "%$query%") or
                (JournalEntries.narration like "%$query%")
        }.orderBy(JournalEntries.date to SortOrder.DESC)
            .map { it.toJournalEntryModel() }
    }

    fun getByAccount(accountId: String): List<JournalEntryModel> = dbQuery {
        val entryIds = JournalLines.select(JournalLines.entryId)
            .where { JournalLines.accountId eq accountId }
            .map { it[JournalLines.entryId] }
            .distinct()

        if (entryIds.isEmpty()) {
            emptyList()
        } else {
            JournalEntries.selectAll().where { JournalEntries.id inList entryIds }
                .orderBy(JournalEntries.date to SortOrder.DESC)
                .map { it.toJournalEntryModel() }
        }
    }

    fun getByDateRange(orgId: String, startDate: String, endDate: String): List<JournalEntryModel> = dbQuery {
        JournalEntries.selectAll().where {
            (JournalEntries.orgId eq orgId) and
                (JournalEntries.date greaterEq startDate) and
                (JournalEntries.date lessEq endDate)
        }.orderBy(JournalEntries.date to SortOrder.DESC)
            .map { it.toJournalEntryModel() }
    }

    fun upsert(model: JournalEntryModel): JournalEntryModel = dbQuery {
        val existing = JournalEntries.selectAll().where { JournalEntries.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toJournalEntryModel() = JournalEntryModel(
        id = this[JournalEntries.id],
        orgId = this[JournalEntries.orgId],
        entryNumber = this[JournalEntries.entryNumber],
        date = this[JournalEntries.date],
        narration = this[JournalEntries.narration],
        type = this[JournalEntries.type],
        referenceType = this[JournalEntries.referenceType],
        referenceId = this[JournalEntries.referenceId],
        isPosted = this[JournalEntries.isPosted],
        syncedAt = this[JournalEntries.syncedAt],
        updatedAt = this[JournalEntries.updatedAt],
    )
}
