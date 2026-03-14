package com.kontafy.desktop.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.InvoiceDto
import com.kontafy.desktop.theme.KontafyColors
import java.text.NumberFormat
import java.util.*

@Composable
fun InvoiceRow(
    invoice: InvoiceDto,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        color = KontafyColors.SurfaceElevated,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Invoice number
            Column(modifier = Modifier.width(140.dp)) {
                Text(
                    text = invoice.invoiceNumber,
                    style = MaterialTheme.typography.bodyLarge,
                    color = KontafyColors.Navy,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = invoice.issueDate,
                    style = MaterialTheme.typography.bodySmall,
                    color = KontafyColors.Muted,
                )
            }

            // Customer
            Text(
                text = invoice.customerName,
                style = MaterialTheme.typography.bodyLarge,
                color = KontafyColors.Ink,
                modifier = Modifier.weight(1f),
            )

            // Status badge
            StatusBadge(
                status = invoice.status,
                modifier = Modifier.width(90.dp),
            )

            Spacer(Modifier.width(24.dp))

            // Amount
            Text(
                text = formatCurrency(invoice.amount, invoice.currency),
                style = MaterialTheme.typography.bodyLarge,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.width(120.dp),
            )

            // Due date
            Text(
                text = invoice.dueDate,
                style = MaterialTheme.typography.bodyMedium,
                color = KontafyColors.Muted,
                modifier = Modifier.width(100.dp),
            )
        }
    }
}

@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier,
) {
    val (bgColor, textColor, label) = when (status.uppercase()) {
        "PAID" -> Triple(KontafyColors.StatusPaidBg, KontafyColors.StatusPaid, "Paid")
        "SENT" -> Triple(KontafyColors.StatusSentBg, KontafyColors.StatusSent, "Sent")
        "OVERDUE" -> Triple(KontafyColors.StatusOverdueBg, KontafyColors.StatusOverdue, "Overdue")
        else -> Triple(KontafyColors.StatusDraftBg, KontafyColors.StatusDraft, "Draft")
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(6.dp),
        color = bgColor,
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = textColor,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

fun formatCurrency(amount: Double, currency: String = "INR"): String {
    val locale = when (currency) {
        "INR" -> Locale("en", "IN")
        "USD" -> Locale.US
        "EUR" -> Locale.GERMANY
        else -> Locale.getDefault()
    }
    val formatter = NumberFormat.getCurrencyInstance(locale)
    return formatter.format(amount)
}
