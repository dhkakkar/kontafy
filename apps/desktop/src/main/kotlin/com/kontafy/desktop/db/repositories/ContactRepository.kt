package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.ContactModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.Contacts
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.like
import java.math.BigDecimal
import java.time.LocalDateTime

class ContactRepository {

    fun getAll(): List<ContactModel> = dbQuery {
        Contacts.selectAll().map { it.toContactModel() }
    }

    fun getById(id: String): ContactModel? = dbQuery {
        Contacts.selectAll().where { Contacts.id eq id }
            .map { it.toContactModel() }
            .singleOrNull()
    }

    fun getByOrgId(orgId: String): List<ContactModel> = dbQuery {
        Contacts.selectAll().where { Contacts.orgId eq orgId }
            .map { it.toContactModel() }
    }

    fun create(model: ContactModel): ContactModel = dbQuery {
        Contacts.insert {
            it[id] = model.id
            it[orgId] = model.orgId
            it[name] = model.name
            it[type] = model.type
            it[email] = model.email
            it[phone] = model.phone
            it[gstin] = model.gstin
            it[pan] = model.pan
            it[billingAddress] = model.billingAddress
            it[shippingAddress] = model.shippingAddress
            it[city] = model.city
            it[state] = model.state
            it[stateCode] = model.stateCode
            it[pincode] = model.pincode
            it[creditLimit] = model.creditLimit
            it[outstandingBalance] = model.outstandingBalance
            it[isActive] = model.isActive
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
        }
        model
    }

    fun update(model: ContactModel): Boolean = dbQuery {
        Contacts.update({ Contacts.id eq model.id }) {
            it[name] = model.name
            it[type] = model.type
            it[email] = model.email
            it[phone] = model.phone
            it[gstin] = model.gstin
            it[pan] = model.pan
            it[billingAddress] = model.billingAddress
            it[shippingAddress] = model.shippingAddress
            it[city] = model.city
            it[state] = model.state
            it[stateCode] = model.stateCode
            it[pincode] = model.pincode
            it[creditLimit] = model.creditLimit
            it[outstandingBalance] = model.outstandingBalance
            it[isActive] = model.isActive
            it[syncedAt] = model.syncedAt
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        Contacts.deleteWhere { Contacts.id eq id } > 0
    }

    fun search(query: String): List<ContactModel> = dbQuery {
        Contacts.selectAll().where {
            (Contacts.name like "%$query%") or
                (Contacts.email like "%$query%") or
                (Contacts.phone like "%$query%") or
                (Contacts.gstin like "%$query%")
        }.map { it.toContactModel() }
    }

    fun getByType(orgId: String, type: String): List<ContactModel> = dbQuery {
        Contacts.selectAll().where {
            (Contacts.orgId eq orgId) and (Contacts.type eq type)
        }.map { it.toContactModel() }
    }

    fun getOutstanding(orgId: String): List<ContactModel> = dbQuery {
        Contacts.selectAll().where {
            (Contacts.orgId eq orgId) and (Contacts.outstandingBalance greater BigDecimal.ZERO)
        }.map { it.toContactModel() }
    }

    fun upsert(model: ContactModel): ContactModel = dbQuery {
        val existing = Contacts.selectAll().where { Contacts.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toContactModel() = ContactModel(
        id = this[Contacts.id],
        orgId = this[Contacts.orgId],
        name = this[Contacts.name],
        type = this[Contacts.type],
        email = this[Contacts.email],
        phone = this[Contacts.phone],
        gstin = this[Contacts.gstin],
        pan = this[Contacts.pan],
        billingAddress = this[Contacts.billingAddress],
        shippingAddress = this[Contacts.shippingAddress],
        city = this[Contacts.city],
        state = this[Contacts.state],
        stateCode = this[Contacts.stateCode],
        pincode = this[Contacts.pincode],
        creditLimit = this[Contacts.creditLimit],
        outstandingBalance = this[Contacts.outstandingBalance],
        isActive = this[Contacts.isActive],
        syncedAt = this[Contacts.syncedAt],
        updatedAt = this[Contacts.updatedAt],
    )
}
