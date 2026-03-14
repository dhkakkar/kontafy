package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.InvoiceModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.Invoices
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.like
import java.time.LocalDateTime

class InvoiceRepository {

    fun getAll(): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where { Invoices.isDeleted eq false }
            .orderBy(Invoices.issueDate to SortOrder.DESC)
            .map { it.toInvoiceModel() }
    }

    fun getById(id: String): InvoiceModel? = dbQuery {
        Invoices.selectAll().where { (Invoices.id eq id) and (Invoices.isDeleted eq false) }
            .map { it.toInvoiceModel() }
            .singleOrNull()
    }

    fun getByOrgId(orgId: String): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where {
            (Invoices.orgId eq orgId) and (Invoices.isDeleted eq false)
        }.orderBy(Invoices.issueDate to SortOrder.DESC)
            .map { it.toInvoiceModel() }
    }

    fun create(model: InvoiceModel): InvoiceModel = dbQuery {
        Invoices.insert {
            it[id] = model.id
            it[orgId] = model.orgId
            it[invoiceNumber] = model.invoiceNumber
            it[contactId] = model.contactId
            it[type] = model.type
            it[status] = model.status
            it[issueDate] = model.issueDate
            it[dueDate] = model.dueDate
            it[subtotal] = model.subtotal
            it[discountAmount] = model.discountAmount
            it[taxAmount] = model.taxAmount
            it[totalAmount] = model.totalAmount
            it[amountPaid] = model.amountPaid
            it[amountDue] = model.amountDue
            it[currency] = model.currency
            it[notes] = model.notes
            it[terms] = model.terms
            it[placeOfSupply] = model.placeOfSupply
            it[reverseCharge] = model.reverseCharge
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
            it[isDeleted] = model.isDeleted
        }
        model
    }

    fun update(model: InvoiceModel): Boolean = dbQuery {
        Invoices.update({ Invoices.id eq model.id }) {
            it[invoiceNumber] = model.invoiceNumber
            it[contactId] = model.contactId
            it[type] = model.type
            it[status] = model.status
            it[issueDate] = model.issueDate
            it[dueDate] = model.dueDate
            it[subtotal] = model.subtotal
            it[discountAmount] = model.discountAmount
            it[taxAmount] = model.taxAmount
            it[totalAmount] = model.totalAmount
            it[amountPaid] = model.amountPaid
            it[amountDue] = model.amountDue
            it[currency] = model.currency
            it[notes] = model.notes
            it[terms] = model.terms
            it[placeOfSupply] = model.placeOfSupply
            it[reverseCharge] = model.reverseCharge
            it[syncedAt] = model.syncedAt
            it[updatedAt] = LocalDateTime.now()
            it[isDeleted] = model.isDeleted
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        Invoices.update({ Invoices.id eq id }) {
            it[isDeleted] = true
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    fun search(query: String): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where {
            (Invoices.isDeleted eq false) and (
                (Invoices.invoiceNumber like "%$query%") or
                    (Invoices.notes like "%$query%")
                )
        }.orderBy(Invoices.issueDate to SortOrder.DESC)
            .map { it.toInvoiceModel() }
    }

    fun getByStatus(orgId: String, status: String): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where {
            (Invoices.orgId eq orgId) and (Invoices.status eq status) and (Invoices.isDeleted eq false)
        }.orderBy(Invoices.issueDate to SortOrder.DESC)
            .map { it.toInvoiceModel() }
    }

    fun getByContact(contactId: String): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where {
            (Invoices.contactId eq contactId) and (Invoices.isDeleted eq false)
        }.orderBy(Invoices.issueDate to SortOrder.DESC)
            .map { it.toInvoiceModel() }
    }

    fun getNextNumber(orgId: String, prefix: String = "INV"): String = dbQuery {
        val maxNumber = Invoices.selectAll().where { Invoices.orgId eq orgId }
            .orderBy(Invoices.invoiceNumber to SortOrder.DESC)
            .limit(1)
            .map { it[Invoices.invoiceNumber] }
            .firstOrNull()

        if (maxNumber != null) {
            val numPart = maxNumber.replace(Regex("[^0-9]"), "").toIntOrNull() ?: 0
            "$prefix-${(numPart + 1).toString().padStart(5, '0')}"
        } else {
            "$prefix-00001"
        }
    }

    fun getOverdue(orgId: String, currentDate: String): List<InvoiceModel> = dbQuery {
        Invoices.selectAll().where {
            (Invoices.orgId eq orgId) and
                (Invoices.isDeleted eq false) and
                (Invoices.status neq "paid") and
                (Invoices.status neq "cancelled") and
                (Invoices.dueDate less currentDate)
        }.orderBy(Invoices.dueDate to SortOrder.ASC)
            .map { it.toInvoiceModel() }
    }

    fun upsert(model: InvoiceModel): InvoiceModel = dbQuery {
        val existing = Invoices.selectAll().where { Invoices.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toInvoiceModel() = InvoiceModel(
        id = this[Invoices.id],
        orgId = this[Invoices.orgId],
        invoiceNumber = this[Invoices.invoiceNumber],
        contactId = this[Invoices.contactId],
        type = this[Invoices.type],
        status = this[Invoices.status],
        issueDate = this[Invoices.issueDate],
        dueDate = this[Invoices.dueDate],
        subtotal = this[Invoices.subtotal],
        discountAmount = this[Invoices.discountAmount],
        taxAmount = this[Invoices.taxAmount],
        totalAmount = this[Invoices.totalAmount],
        amountPaid = this[Invoices.amountPaid],
        amountDue = this[Invoices.amountDue],
        currency = this[Invoices.currency],
        notes = this[Invoices.notes],
        terms = this[Invoices.terms],
        placeOfSupply = this[Invoices.placeOfSupply],
        reverseCharge = this[Invoices.reverseCharge],
        syncedAt = this[Invoices.syncedAt],
        updatedAt = this[Invoices.updatedAt],
        isDeleted = this[Invoices.isDeleted],
    )
}
