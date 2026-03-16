package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object TDSEntries : Table("tds_entries") {
    val id = varchar("id", 64)
    val orgId = varchar("org_id", 64).references(Organizations.id)
    val section = varchar("section", 10)
    val deducteeName = varchar("deductee_name", 255)
    val pan = varchar("pan", 10)
    val amount = decimal("amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val tdsRate = decimal("tds_rate", 5, 2).default(java.math.BigDecimal.ZERO)
    val tdsAmount = decimal("tds_amount", 15, 2).default(java.math.BigDecimal.ZERO)
    val status = varchar("status", 20) // Deducted, Deposited, Pending
    val date = varchar("date", 20)
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val syncedAt = datetime("synced_at").nullable()
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)

    init {
        index(isUnique = false, orgId)
    }
}
