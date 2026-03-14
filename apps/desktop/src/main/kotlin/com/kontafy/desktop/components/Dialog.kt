package com.kontafy.desktop.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.kontafy.desktop.theme.KontafyColors

@Composable
fun KontafyDialog(
    title: String,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    actions: @Composable RowScope.() -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = modifier.widthIn(min = 320.dp, max = 560.dp),
            shape = RoundedCornerShape(16.dp),
            color = KontafyColors.SurfaceElevated,
            shadowElevation = 8.dp,
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.headlineSmall,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(16.dp))
                content()
                Spacer(Modifier.height(20.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp, alignment = androidx.compose.ui.Alignment.End),
                ) {
                    actions()
                }
            }
        }
    }
}

@Composable
fun KontafyConfirmDialog(
    title: String,
    message: String,
    confirmText: String = "Confirm",
    cancelText: String = "Cancel",
    confirmVariant: ButtonVariant = ButtonVariant.Primary,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    KontafyDialog(
        title = title,
        onDismiss = onDismiss,
        actions = {
            KontafyButton(
                text = cancelText,
                onClick = onDismiss,
                variant = ButtonVariant.Outline,
            )
            KontafyButton(
                text = confirmText,
                onClick = onConfirm,
                variant = confirmVariant,
            )
        },
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = KontafyColors.InkSecondary,
        )
    }
}
