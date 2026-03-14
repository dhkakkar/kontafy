package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table

object InvoiceItems : Table("invoice_items") {
    val id = varchar("id", 64)
    val invoiceId = varchar("invoice_id", 64).references(Invoices.id)
    val productId = varchar("product_id", 64).nullable()
    val description = text("description").nullable()
    val hsnCode = varchar("hsn_code", 20).nullable()
    val quantity = decimal("quantity", 15, 4).default(java.math.BigDecimal.ONE)
    val unitPrice = decimal("unit_price", 15, 2).default(java.math.BigDecimal.ZERO)
    val discountPercent = decimal("discount_percent", 5, 2).default(java.math.BigDecimal.ZERO)
    val taxRate = decimal("tax_rate", 5, 2).default(java.math.BigDecimal.ZERO)
    val cgstAmount = decimal("cgst_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val sgstAmount = decimal("sgst_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val igstAmount = decimal("igst_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val cessAmount = decimal("cess_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val totalAmount = decimal("total_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val sortOrder = integer("sort_order").default(0)

    override val primaryKey = PrimaryKey(id)
}
