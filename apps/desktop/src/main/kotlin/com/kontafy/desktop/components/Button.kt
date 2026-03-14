package com.kontafy.desktop.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.theme.KontafyColors

@Composable
fun KontafyButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    variant: ButtonVariant = ButtonVariant.Primary,
    isLoading: Boolean = false,
) {
    val colors = when (variant) {
        ButtonVariant.Primary -> ButtonDefaults.buttonColors(
            containerColor = KontafyColors.Navy,
            contentColor = KontafyColors.White,
            disabledContainerColor = KontafyColors.Navy.copy(alpha = 0.5f),
            disabledContentColor = KontafyColors.White.copy(alpha = 0.7f),
        )
        ButtonVariant.Secondary -> ButtonDefaults.buttonColors(
            containerColor = KontafyColors.Green,
            contentColor = KontafyColors.White,
            disabledContainerColor = KontafyColors.Green.copy(alpha = 0.5f),
            disabledContentColor = KontafyColors.White.copy(alpha = 0.7f),
        )
        ButtonVariant.Outline -> ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            contentColor = KontafyColors.Navy,
            disabledContainerColor = Color.Transparent,
            disabledContentColor = KontafyColors.Muted,
        )
        ButtonVariant.Ghost -> ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            contentColor = KontafyColors.Ink,
            disabledContainerColor = Color.Transparent,
            disabledContentColor = KontafyColors.Muted,
        )
    }

    Button(
        onClick = onClick,
        modifier = modifier.height(42.dp),
        enabled = enabled && !isLoading,
        shape = RoundedCornerShape(8.dp),
        colors = colors,
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 0.dp),
        elevation = if (variant == ButtonVariant.Outline || variant == ButtonVariant.Ghost) {
            ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp)
        } else {
            ButtonDefaults.buttonElevation(1.dp, 2.dp, 0.dp)
        },
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.height(18.dp),
                strokeWidth = 2.dp,
                color = colors.contentColor,
            )
        } else {
            Text(text, style = MaterialTheme.typography.labelLarge)
        }
    }
}

enum class ButtonVariant {
    Primary,
    Secondary,
    Outline,
    Ghost,
}
