package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.Users
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.security.MessageDigest
import java.time.LocalDateTime

data class UserModel(
    val id: Int = 0,
    val name: String,
    val email: String,
    val passwordHash: String,
    val role: String = "ADMIN",
    val organizationId: String? = null,
    val licenseKey: String? = null,
    val licenseType: String = "FREE",
    val licenseExpiry: String? = null,
    val isActive: Boolean = true,
    val lastLoginAt: LocalDateTime? = null,
    val createdAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null,
)

class UserRepository {

    fun getAll(): List<UserModel> = dbQuery {
        Users.selectAll().map { it.toUserModel() }
    }

    fun getById(id: Int): UserModel? = dbQuery {
        Users.selectAll().where { Users.id eq id }
            .map { it.toUserModel() }
            .singleOrNull()
    }

    fun getByEmail(email: String): UserModel? = dbQuery {
        Users.selectAll().where { Users.email eq email }
            .map { it.toUserModel() }
            .singleOrNull()
    }

    fun create(model: UserModel): UserModel = dbQuery {
        val id = Users.insert {
            it[name] = model.name
            it[email] = model.email
            it[passwordHash] = model.passwordHash
            it[role] = model.role
            it[organizationId] = model.organizationId
            it[licenseKey] = model.licenseKey
            it[licenseType] = model.licenseType
            it[licenseExpiry] = model.licenseExpiry
            it[isActive] = model.isActive
            it[createdAt] = LocalDateTime.now()
            it[updatedAt] = LocalDateTime.now()
        } get Users.id
        model.copy(id = id)
    }

    fun updateLastLogin(userId: Int) = dbQuery {
        Users.update({ Users.id eq userId }) {
            it[lastLoginAt] = LocalDateTime.now()
            it[updatedAt] = LocalDateTime.now()
        }
    }

    fun updateLicense(userId: Int, licenseKey: String, licenseType: String, expiry: String?) = dbQuery {
        Users.update({ Users.id eq userId }) {
            it[Users.licenseKey] = licenseKey
            it[Users.licenseType] = licenseType
            it[Users.licenseExpiry] = expiry
            it[updatedAt] = LocalDateTime.now()
        }
    }

    fun updatePassword(userId: Int, newPasswordHash: String) = dbQuery {
        Users.update({ Users.id eq userId }) {
            it[passwordHash] = newPasswordHash
            it[updatedAt] = LocalDateTime.now()
        }
    }

    fun hasAnyUsers(): Boolean = dbQuery {
        Users.selectAll().count() > 0
    }

    fun authenticate(email: String, password: String): UserModel? {
        val user = getByEmail(email) ?: return null
        if (!user.isActive) return null
        val hash = hashPassword(password)
        return if (user.passwordHash == hash) {
            updateLastLogin(user.id)
            user
        } else null
    }

    private fun ResultRow.toUserModel() = UserModel(
        id = this[Users.id],
        name = this[Users.name],
        email = this[Users.email],
        passwordHash = this[Users.passwordHash],
        role = this[Users.role],
        organizationId = this[Users.organizationId],
        licenseKey = this[Users.licenseKey],
        licenseType = this[Users.licenseType],
        licenseExpiry = this[Users.licenseExpiry],
        isActive = this[Users.isActive],
        lastLoginAt = this[Users.lastLoginAt],
        createdAt = this[Users.createdAt],
        updatedAt = this[Users.updatedAt],
    )

    companion object {
        fun hashPassword(password: String): String {
            val digest = MessageDigest.getInstance("SHA-256")
            val bytes = digest.digest(("kontafy_salt_" + password).toByteArray())
            return bytes.joinToString("") { "%02x".format(it) }
        }
    }
}
