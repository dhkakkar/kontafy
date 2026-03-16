package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.AuditLogEntry
import com.kontafy.desktop.db.repositories.AuditLogRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter

@Composable
fun AuditTrailScreen(
    currentOrgId: String,
    auditLogRepository: AuditLogRepository = AuditLogRepository(),
) {
    var logs by remember { mutableStateOf<List<AuditLogEntry>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedFilter by remember { mutableStateOf("All") }
    val scope = rememberCoroutineScope()

    val filters = listOf("All", "Invoice", "Journal Entry", "Payment", "Contact", "Product", "Bank Account", "Purchase Order")
    val filterToType = mapOf(
        "All" to null,
        "Invoice" to "invoice",
        "Journal Entry" to "journal_entry",
        "Payment" to "payment",
        "Contact" to "contact",
        "Product" to "product",
        "Bank Account" to "bank_account",
        "Purchase Order" to "purchase_order",
    )

    LaunchedEffect(selectedFilter) {
        scope.launch {
            isLoading = true
            try {
                val type = filterToType[selectedFilter]
                logs = if (type != null) {
                    auditLogRepository.getByEntityType(currentOrgId, type, 200)
                } else {
                    auditLogRepository.getByOrgId(currentOrgId, 200)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            isLoading = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
        TopBar(title = "Audit Trail")

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Filters
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    filters.forEach { filter ->
                        FilterChip(
                            selected = selectedFilter == filter,
                            onClick = { selectedFilter = filter },
                            label = { Text(filter) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = KontafyColors.Navy,
                                selectedLabelColor = KontafyColors.White,
                                containerColor = KontafyColors.SurfaceElevated,
                                labelColor = KontafyColors.Muted,
                            ),
                            shape = RoundedCornerShape(8.dp),
                            border = FilterChipDefaults.filterChipBorder(
                                borderColor = KontafyColors.Border,
                                selectedBorderColor = KontafyColors.Navy,
                                enabled = true,
                                selected = selectedFilter == filter,
                            ),
                        )
                    }
                }
            }

            if (isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = KontafyColors.Navy)
                    }
                }
            } else if (logs.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Outlined.History, null, tint = KontafyColors.MutedLight, modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(12.dp))
                            Text("No audit logs found", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
                        }
                    }
                }
            } else {
                // Table header
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = KontafyColors.Surface,
                        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                        ) {
                            Text("Date & Time", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(160.dp))
                            Text("Action", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                            Text("Entity", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(130.dp))
                            Text("Description", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                            Text("Changes", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(250.dp))
                        }
                    }
                    HorizontalDivider(color = KontafyColors.Border)
                }

                items(logs, key = { it.id }) { log ->
                    AuditLogRow(log)
                    HorizontalDivider(color = KontafyColors.BorderLight)
                }
            }
        }
    }
}

@Composable
private fun AuditLogRow(log: AuditLogEntry) {
    val actionColor = when (log.action) {
        "CREATED" -> KontafyColors.Green
        "UPDATED" -> KontafyColors.StatusSent
        "DELETED" -> KontafyColors.StatusOverdue
        "STATUS_CHANGE" -> Color(0xFF8B5CF6)
        "STOCK_RECEIVED" -> KontafyColors.Navy
        "STOCK_SOLD" -> Color(0xFFE67E22)
        "STOCK_ADJUSTED" -> Color(0xFF9B59B6)
        else -> KontafyColors.Muted
    }

    val entityLabel = log.entityType.replace("_", " ").replaceFirstChar { it.uppercase() }
    val timeFormatted = log.createdAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = KontafyColors.SurfaceElevated,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(timeFormatted, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.width(160.dp))
            Box(modifier = Modifier.width(120.dp)) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = actionColor.copy(alpha = 0.1f),
                ) {
                    Text(
                        log.action.replace("_", " "),
                        style = MaterialTheme.typography.labelSmall,
                        color = actionColor,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                    )
                }
            }
            Text(entityLabel, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.Medium, modifier = Modifier.width(130.dp))
            Text(log.description, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f), maxLines = 2)
            Column(modifier = Modifier.width(250.dp)) {
                if (log.fieldChanged != null) {
                    Text(
                        "Field: ${log.fieldChanged}",
                        style = MaterialTheme.typography.bodySmall,
                        color = KontafyColors.Muted,
                    )
                }
                if (log.oldValue != null) {
                    Text(
                        "Old: ${log.oldValue}",
                        style = MaterialTheme.typography.bodySmall,
                        color = KontafyColors.StatusOverdue,
                        maxLines = 1,
                    )
                }
                if (log.newValue != null) {
                    Text(
                        "New: ${log.newValue}",
                        style = MaterialTheme.typography.bodySmall,
                        color = KontafyColors.Green,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}
