package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.InvoiceItemModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.InvoiceItems
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq

class InvoiceItemRepository {

    fun getAll(): List<InvoiceItemModel> = dbQuery {
        InvoiceItems.selectAll().map { it.toInvoiceItemModel() }
    }

    fun getById(id: String): InvoiceItemModel? = dbQuery {
        InvoiceItems.selectAll().where { InvoiceItems.id eq id }
            .map { it.toInvoiceItemModel() }
            .singleOrNull()
    }

    fun getByOrgId(orgId: String): List<InvoiceItemModel> = dbQuery {
        // Invoice items don't have orgId directly; join through invoices if needed
        InvoiceItems.selectAll().map { it.toInvoiceItemModel() }
    }

    fun create(model: InvoiceItemModel): InvoiceItemModel = dbQuery {
        InvoiceItems.insert {
            it[id] = model.id
            it[invoiceId] = model.invoiceId
            it[productId] = model.productId
            it[description] = model.description
            it[hsnCode] = model.hsnCode
            it[quantity] = model.quantity
            it[unitPrice] = model.unitPrice
            it[discountPercent] = model.discountPercent
            it[taxRate] = model.taxRate
            it[cgstAmount] = model.cgstAmount
            it[sgstAmount] = model.sgstAmount
            it[igstAmount] = model.igstAmount
            it[cessAmount] = model.cessAmount
            it[totalAmount] = model.totalAmount
            it[sortOrder] = model.sortOrder
        }
        model
    }

    fun update(model: InvoiceItemModel): Boolean = dbQuery {
        InvoiceItems.update({ InvoiceItems.id eq model.id }) {
            it[invoiceId] = model.invoiceId
            it[productId] = model.productId
            it[description] = model.description
            it[hsnCode] = model.hsnCode
            it[quantity] = model.quantity
            it[unitPrice] = model.unitPrice
            it[discountPercent] = model.discountPercent
            it[taxRate] = model.taxRate
            it[cgstAmount] = model.cgstAmount
            it[sgstAmount] = model.sgstAmount
            it[igstAmount] = model.igstAmount
            it[cessAmount] = model.cessAmount
            it[totalAmount] = model.totalAmount
            it[sortOrder] = model.sortOrder
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        InvoiceItems.deleteWhere { InvoiceItems.id eq id } > 0
    }

    fun search(query: String): List<InvoiceItemModel> = dbQuery {
        InvoiceItems.selectAll().where {
            (InvoiceItems.description like "%$query%") or
                (InvoiceItems.hsnCode like "%$query%")
        }.map { it.toInvoiceItemModel() }
    }

    fun getByInvoice(invoiceId: String): List<InvoiceItemModel> = dbQuery {
        InvoiceItems.selectAll().where { InvoiceItems.invoiceId eq invoiceId }
            .orderBy(InvoiceItems.sortOrder to SortOrder.ASC)
            .map { it.toInvoiceItemModel() }
    }

    fun deleteByInvoice(invoiceId: String): Int = dbQuery {
        InvoiceItems.deleteWhere { InvoiceItems.invoiceId eq invoiceId }
    }

    fun upsert(model: InvoiceItemModel): InvoiceItemModel = dbQuery {
        val existing = InvoiceItems.selectAll().where { InvoiceItems.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toInvoiceItemModel() = InvoiceItemModel(
        id = this[InvoiceItems.id],
        invoiceId = this[InvoiceItems.invoiceId],
        productId = this[InvoiceItems.productId],
        description = this[InvoiceItems.description],
        hsnCode = this[InvoiceItems.hsnCode],
        quantity = this[InvoiceItems.quantity],
        unitPrice = this[InvoiceItems.unitPrice],
        discountPercent = this[InvoiceItems.discountPercent],
        taxRate = this[InvoiceItems.taxRate],
        cgstAmount = this[InvoiceItems.cgstAmount],
        sgstAmount = this[InvoiceItems.sgstAmount],
        igstAmount = this[InvoiceItems.igstAmount],
        cessAmount = this[InvoiceItems.cessAmount],
        totalAmount = this[InvoiceItems.totalAmount],
        sortOrder = this[InvoiceItems.sortOrder],
    )
}
