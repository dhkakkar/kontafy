package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object Users : Table("users") {
    val id = integer("id").autoIncrement()
    val name = varchar("name", 255)
    val email = varchar("email", 255).uniqueIndex()
    val passwordHash = varchar("password_hash", 255)
    val role = varchar("role", 50).default("ADMIN") // ADMIN, USER, VIEWER
    val organizationId = varchar("organization_id", 64).nullable()
    val licenseKey = varchar("license_key", 255).nullable()
    val licenseType = varchar("license_type", 50).default("FREE") // FREE, STARTER, PROFESSIONAL, ENTERPRISE
    val licenseExpiry = varchar("license_expiry", 20).nullable()
    val isActive = bool("is_active").default(true)
    val lastLoginAt = datetime("last_login_at").nullable()
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)
}
