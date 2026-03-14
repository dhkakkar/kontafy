package com.kontafy.desktop.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ChevronLeft
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.kontafy.desktop.theme.KontafyColors
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

@Composable
fun KontafyDatePicker(
    value: LocalDate?,
    onValueChange: (LocalDate) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "DD/MM/YYYY",
    isError: Boolean = false,
    errorMessage: String? = null,
    enabled: Boolean = true,
) {
    var showDialog by remember { mutableStateOf(false) }
    val displayFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    Column(modifier = modifier) {
        if (label != null) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = if (isError) KontafyColors.Error else KontafyColors.Ink,
                modifier = Modifier.padding(bottom = 6.dp),
            )
        }

        OutlinedTextField(
            value = value?.format(displayFormatter) ?: "",
            onValueChange = {},
            modifier = Modifier.fillMaxWidth().clickable(enabled = enabled) { showDialog = true },
            placeholder = { Text(placeholder, color = KontafyColors.MutedLight) },
            readOnly = true,
            enabled = enabled,
            isError = isError,
            singleLine = true,
            trailingIcon = {
                IconButton(onClick = { if (enabled) showDialog = true }, modifier = Modifier.size(20.dp)) {
                    Icon(Icons.Outlined.CalendarMonth, "Select date", tint = KontafyColors.Muted)
                }
            },
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = KontafyColors.Navy,
                unfocusedBorderColor = KontafyColors.Border,
                cursorColor = KontafyColors.Navy,
                focusedContainerColor = KontafyColors.White,
                unfocusedContainerColor = KontafyColors.White,
                errorBorderColor = KontafyColors.Error,
                disabledBorderColor = KontafyColors.BorderLight,
            ),
            textStyle = MaterialTheme.typography.bodyLarge.copy(color = KontafyColors.Ink),
        )

        if (isError && errorMessage != null) {
            Text(
                text = errorMessage,
                style = MaterialTheme.typography.bodySmall,
                color = KontafyColors.Error,
                modifier = Modifier.padding(top = 4.dp, start = 4.dp),
            )
        }
    }

    if (showDialog) {
        DatePickerDialog(
            selectedDate = value ?: LocalDate.now(),
            onDateSelected = {
                onValueChange(it)
                showDialog = false
            },
            onDismiss = { showDialog = false },
        )
    }
}

@Composable
private fun DatePickerDialog(
    selectedDate: LocalDate,
    onDateSelected: (LocalDate) -> Unit,
    onDismiss: () -> Unit,
) {
    var currentMonth by remember { mutableStateOf(YearMonth.from(selectedDate)) }
    var selected by remember { mutableStateOf(selectedDate) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = KontafyColors.SurfaceElevated,
            shadowElevation = 8.dp,
        ) {
            Column(
                modifier = Modifier.padding(20.dp).width(320.dp),
            ) {
                // Month/Year navigation
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(onClick = { currentMonth = currentMonth.minusMonths(1) }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.ChevronLeft, "Previous month", tint = KontafyColors.Ink)
                    }
                    Text(
                        "${currentMonth.month.getDisplayName(TextStyle.FULL, Locale.ENGLISH)} ${currentMonth.year}",
                        style = MaterialTheme.typography.titleMedium,
                        color = KontafyColors.Ink,
                        fontWeight = FontWeight.SemiBold,
                    )
                    IconButton(onClick = { currentMonth = currentMonth.plusMonths(1) }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Outlined.ChevronRight, "Next month", tint = KontafyColors.Ink)
                    }
                }

                Spacer(Modifier.height(12.dp))

                // Day of week headers
                Row(modifier = Modifier.fillMaxWidth()) {
                    listOf("Su", "Mo", "Tu", "We", "Th", "Fr", "Sa").forEach { day ->
                        Text(
                            text = day,
                            modifier = Modifier.weight(1f),
                            textAlign = TextAlign.Center,
                            style = MaterialTheme.typography.labelSmall,
                            color = KontafyColors.Muted,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }

                Spacer(Modifier.height(8.dp))

                // Calendar grid
                val firstDay = currentMonth.atDay(1)
                val startOffset = firstDay.dayOfWeek.value % 7 // Sunday = 0
                val daysInMonth = currentMonth.lengthOfMonth()

                var dayCounter = 1
                for (week in 0..5) {
                    if (dayCounter > daysInMonth) break
                    Row(modifier = Modifier.fillMaxWidth()) {
                        for (dayOfWeek in 0..6) {
                            val cellIndex = week * 7 + dayOfWeek
                            if (cellIndex < startOffset || dayCounter > daysInMonth) {
                                Spacer(Modifier.weight(1f).aspectRatio(1f))
                            } else {
                                val day = dayCounter
                                val date = currentMonth.atDay(day)
                                val isSelected = date == selected
                                val isToday = date == LocalDate.now()

                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .aspectRatio(1f)
                                        .padding(2.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(
                                            when {
                                                isSelected -> KontafyColors.Navy
                                                isToday -> KontafyColors.Navy.copy(alpha = 0.1f)
                                                else -> KontafyColors.SurfaceElevated
                                            }
                                        )
                                        .clickable { selected = date },
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = "$day",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = when {
                                            isSelected -> KontafyColors.White
                                            else -> KontafyColors.Ink
                                        },
                                        fontWeight = if (isSelected || isToday) FontWeight.SemiBold else FontWeight.Normal,
                                    )
                                }
                                dayCounter++
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Action buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
                ) {
                    KontafyButton(
                        text = "Today",
                        onClick = {
                            selected = LocalDate.now()
                            currentMonth = YearMonth.now()
                        },
                        variant = ButtonVariant.Ghost,
                    )
                    KontafyButton(
                        text = "Cancel",
                        onClick = onDismiss,
                        variant = ButtonVariant.Outline,
                    )
                    KontafyButton(
                        text = "Select",
                        onClick = { onDateSelected(selected) },
                        variant = ButtonVariant.Primary,
                    )
                }
            }
        }
    }
}
