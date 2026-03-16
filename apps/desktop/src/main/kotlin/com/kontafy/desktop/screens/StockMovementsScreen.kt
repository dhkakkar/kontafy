package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.AuditLogEntry
import com.kontafy.desktop.db.repositories.AuditLogRepository
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter

@Composable
fun StockMovementsScreen(
    apiClient: ApiClient,
    currentOrgId: String = "",
    productRepository: ProductRepository = ProductRepository(),
    auditLogRepository: AuditLogRepository = AuditLogRepository(),
    onNewAdjustment: () -> Unit,
) {
    var movements by remember { mutableStateOf<List<AuditLogEntry>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedFilter by remember { mutableStateOf("All") }
    var selectedMovement by remember { mutableStateOf<AuditLogEntry?>(null) }
    val scope = rememberCoroutineScope()

    val filters = listOf("All", "Received", "Sold", "Adjusted")
    val filterToAction = mapOf(
        "All" to null,
        "Received" to "STOCK_RECEIVED",
        "Sold" to "STOCK_SOLD",
        "Adjusted" to "STOCK_ADJUSTED",
    )

    // Product name lookup
    val productNames = remember { mutableStateMapOf<String, String>() }

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                productRepository.getAll().forEach { p ->
                    productNames[p.id] = p.name
                }
            } catch (e: Exception) { e.printStackTrace() }
            try {
                movements = auditLogRepository.getStockMovements(currentOrgId)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            isLoading = false
        }
    }

    val filteredMovements = movements.filter { mv ->
        val targetAction = filterToAction[selectedFilter]
        targetAction == null || mv.action == targetAction
    }

    // Detail dialog
    if (selectedMovement != null) {
        val mv = selectedMovement!!
        val productName = productNames[mv.entityId] ?: mv.entityId
        val oldQty = mv.oldValue ?: "—"
        val newQty = mv.newValue ?: "—"
        val change = try {
            val o = mv.oldValue?.toDoubleOrNull() ?: 0.0
            val n = mv.newValue?.toDoubleOrNull() ?: 0.0
            val diff = n - o
            if (diff >= 0) "+${diff.toInt()}" else "${diff.toInt()}"
        } catch (e: Exception) { "—" }

        val typeLabel = when (mv.action) {
            "STOCK_RECEIVED" -> "Stock Received (Purchase Order)"
            "STOCK_SOLD" -> "Stock Sold (Invoice)"
            "STOCK_ADJUSTED" -> "Manual Adjustment"
            else -> mv.action
        }

        AlertDialog(
            onDismissRequest = { selectedMovement = null },
            title = {
                Text("Stock Movement Detail", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    MovementDetailRow("Product", productName)
                    MovementDetailRow("Type", typeLabel)
                    MovementDetailRow("Date", mv.createdAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
                    HorizontalDivider(color = KontafyColors.BorderLight)
                    MovementDetailRow("Previous Stock", oldQty)
                    MovementDetailRow("New Stock", newQty)
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    ) {
                        Text(
                            "Change",
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Muted,
                            modifier = Modifier.width(130.dp),
                        )
                        val changeColor = if (change.startsWith("+")) KontafyColors.Green else KontafyColors.StatusOverdue
                        Text(
                            change,
                            style = MaterialTheme.typography.titleMedium,
                            color = changeColor,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    HorizontalDivider(color = KontafyColors.BorderLight)
                    MovementDetailRow("Reference", mv.description)
                }
            },
            confirmButton = {
                KontafyButton(
                    text = "Close",
                    onClick = { selectedMovement = null },
                    variant = ButtonVariant.Outline,
                )
            },
        )
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Stock Movements",
            actions = {
                KontafyButton(
                    text = "New Adjustment",
                    onClick = onNewAdjustment,
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        // Filter chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(KontafyColors.SurfaceElevated)
                .padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            filters.forEach { filter ->
                FilterChip(
                    selected = selectedFilter == filter,
                    onClick = { selectedFilter = filter },
                    label = {
                        Text(filter, style = MaterialTheme.typography.labelLarge)
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = KontafyColors.Navy.copy(alpha = 0.1f),
                        selectedLabelColor = KontafyColors.Navy,
                        containerColor = KontafyColors.Surface,
                        labelColor = KontafyColors.Muted,
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        borderColor = KontafyColors.Border,
                        selectedBorderColor = KontafyColors.Navy,
                        enabled = true,
                        selected = selectedFilter == filter,
                    ),
                    shape = RoundedCornerShape(8.dp),
                )
            }
        }

        HorizontalDivider(color = KontafyColors.BorderLight)

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (filteredMovements.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No stock movements", style = MaterialTheme.typography.titleMedium, color = KontafyColors.Muted)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Stock movements will appear here when invoices are created, POs are received, or manual adjustments are made",
                        style = MaterialTheme.typography.bodyMedium,
                        color = KontafyColors.MutedLight,
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
            ) {
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
                            Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp))
                            Text("Product", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                            Text("Type", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(130.dp))
                            Text("Change", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                            Text("Balance", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                            Text("Reference", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(250.dp))
                        }
                    }
                    HorizontalDivider(color = KontafyColors.Border)
                }

                items(filteredMovements, key = { it.id }) { mv ->
                    StockMovementRow(
                        mv = mv,
                        productName = productNames[mv.entityId] ?: mv.entityId,
                        onClick = { selectedMovement = mv },
                    )
                    HorizontalDivider(color = KontafyColors.BorderLight)
                }
            }
        }
    }
}

@Composable
private fun StockMovementRow(
    mv: AuditLogEntry,
    productName: String,
    onClick: () -> Unit,
) {
    val change = try {
        val o = mv.oldValue?.toDoubleOrNull() ?: 0.0
        val n = mv.newValue?.toDoubleOrNull() ?: 0.0
        val diff = n - o
        if (diff >= 0) "+${diff.toInt()}" else "${diff.toInt()}"
    } catch (e: Exception) { "—" }

    val changeColor = if (change.startsWith("+")) KontafyColors.Green else KontafyColors.StatusOverdue

    val typeLabel = when (mv.action) {
        "STOCK_RECEIVED" -> "Received"
        "STOCK_SOLD" -> "Sold"
        "STOCK_ADJUSTED" -> "Adjustment"
        else -> mv.action
    }

    val badgeType = when (mv.action) {
        "STOCK_RECEIVED" -> BadgeType.Success
        "STOCK_SOLD" -> BadgeType.Info
        "STOCK_ADJUSTED" -> BadgeType.Warning
        else -> BadgeType.Neutral
    }

    Surface(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        color = KontafyColors.SurfaceElevated,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                mv.createdAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")),
                style = MaterialTheme.typography.bodySmall,
                color = KontafyColors.Muted,
                modifier = Modifier.width(140.dp),
            )
            Text(
                productName,
                style = MaterialTheme.typography.bodyLarge,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f),
            )
            Box(modifier = Modifier.width(130.dp)) {
                KontafyBadge(text = typeLabel, type = badgeType)
            }
            Text(
                change,
                style = MaterialTheme.typography.bodyMedium,
                color = changeColor,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.width(100.dp),
            )
            Text(
                mv.newValue ?: "—",
                style = MaterialTheme.typography.bodyMedium,
                color = KontafyColors.Ink,
                modifier = Modifier.width(100.dp),
            )
            Text(
                mv.description,
                style = MaterialTheme.typography.bodySmall,
                color = KontafyColors.Muted,
                modifier = Modifier.width(250.dp),
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun MovementDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = KontafyColors.Muted,
            modifier = Modifier.width(130.dp),
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyLarge,
            color = KontafyColors.Ink,
            fontWeight = FontWeight.Medium,
        )
    }
}
