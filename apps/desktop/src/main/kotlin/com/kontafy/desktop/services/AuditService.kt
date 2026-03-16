package com.kontafy.desktop.services

import com.kontafy.desktop.db.repositories.AuditLogEntry
import com.kontafy.desktop.db.repositories.AuditLogRepository

/**
 * Centralized audit logging service for Indian accounting compliance.
 * Records all create, update, delete, and status change operations
 * across accounting entities.
 */
class AuditService(
    private val auditLogRepository: AuditLogRepository = AuditLogRepository(),
) {
    fun logCreated(orgId: String, entityType: String, entityId: String, description: String) {
        try {
            auditLogRepository.create(
                AuditLogEntry(
                    orgId = orgId,
                    entityType = entityType,
                    entityId = entityId,
                    action = "CREATED",
                    description = description,
                ),
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun logUpdated(
        orgId: String,
        entityType: String,
        entityId: String,
        description: String,
        fieldChanged: String? = null,
        oldValue: String? = null,
        newValue: String? = null,
    ) {
        try {
            auditLogRepository.create(
                AuditLogEntry(
                    orgId = orgId,
                    entityType = entityType,
                    entityId = entityId,
                    action = "UPDATED",
                    fieldChanged = fieldChanged,
                    oldValue = oldValue,
                    newValue = newValue,
                    description = description,
                ),
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun logDeleted(orgId: String, entityType: String, entityId: String, description: String) {
        try {
            auditLogRepository.create(
                AuditLogEntry(
                    orgId = orgId,
                    entityType = entityType,
                    entityId = entityId,
                    action = "DELETED",
                    description = description,
                ),
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun logStatusChange(
        orgId: String,
        entityType: String,
        entityId: String,
        description: String,
        oldStatus: String,
        newStatus: String,
    ) {
        try {
            auditLogRepository.create(
                AuditLogEntry(
                    orgId = orgId,
                    entityType = entityType,
                    entityId = entityId,
                    action = "STATUS_CHANGE",
                    fieldChanged = "status",
                    oldValue = oldStatus,
                    newValue = newStatus,
                    description = description,
                ),
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
