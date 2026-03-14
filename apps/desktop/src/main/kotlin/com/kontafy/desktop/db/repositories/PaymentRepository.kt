package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.PaymentModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.Payments
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.like
import java.time.LocalDateTime

class PaymentRepository {

    fun getAll(): List<PaymentModel> = dbQuery {
        Payments.selectAll()
            .orderBy(Payments.paymentDate to SortOrder.DESC)
            .map { it.toPaymentModel() }
    }

    fun getById(id: String): PaymentModel? = dbQuery {
        Payments.selectAll().where { Payments.id eq id }
            .map { it.toPaymentModel() }
            .singleOrNull()
    }

    fun getByOrgId(orgId: String): List<PaymentModel> = dbQuery {
        Payments.selectAll().where { Payments.orgId eq orgId }
            .orderBy(Payments.paymentDate to SortOrder.DESC)
            .map { it.toPaymentModel() }
    }

    fun create(model: PaymentModel): PaymentModel = dbQuery {
        Payments.insert {
            it[id] = model.id
            it[orgId] = model.orgId
            it[invoiceId] = model.invoiceId
            it[contactId] = model.contactId
            it[amount] = model.amount
            it[paymentDate] = model.paymentDate
            it[method] = model.method
            it[reference] = model.reference
            it[notes] = model.notes
            it[type] = model.type
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
        }
        model
    }

    fun update(model: PaymentModel): Boolean = dbQuery {
        Payments.update({ Payments.id eq model.id }) {
            it[invoiceId] = model.invoiceId
            it[contactId] = model.contactId
            it[amount] = model.amount
            it[paymentDate] = model.paymentDate
            it[method] = model.method
            it[reference] = model.reference
            it[notes] = model.notes
            it[type] = model.type
            it[syncedAt] = model.syncedAt
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        Payments.deleteWhere { Payments.id eq id } > 0
    }

    fun search(query: String): List<PaymentModel> = dbQuery {
        Payments.selectAll().where {
            (Payments.reference like "%$query%") or
                (Payments.notes like "%$query%")
        }.orderBy(Payments.paymentDate to SortOrder.DESC)
            .map { it.toPaymentModel() }
    }

    fun getByInvoice(invoiceId: String): List<PaymentModel> = dbQuery {
        Payments.selectAll().where { Payments.invoiceId eq invoiceId }
            .orderBy(Payments.paymentDate to SortOrder.DESC)
            .map { it.toPaymentModel() }
    }

    fun getByContact(contactId: String): List<PaymentModel> = dbQuery {
        Payments.selectAll().where { Payments.contactId eq contactId }
            .orderBy(Payments.paymentDate to SortOrder.DESC)
            .map { it.toPaymentModel() }
    }

    fun upsert(model: PaymentModel): PaymentModel = dbQuery {
        val existing = Payments.selectAll().where { Payments.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toPaymentModel() = PaymentModel(
        id = this[Payments.id],
        orgId = this[Payments.orgId],
        invoiceId = this[Payments.invoiceId],
        contactId = this[Payments.contactId],
        amount = this[Payments.amount],
        paymentDate = this[Payments.paymentDate],
        method = this[Payments.method],
        reference = this[Payments.reference],
        notes = this[Payments.notes],
        type = this[Payments.type],
        syncedAt = this[Payments.syncedAt],
        updatedAt = this[Payments.updatedAt],
    )
}
