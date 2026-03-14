package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kontafy.desktop.api.AuthService
import com.kontafy.desktop.api.LoginResponse
import com.kontafy.desktop.api.UserDto
import com.kontafy.desktop.components.ButtonVariant
import com.kontafy.desktop.components.KontafyButton
import com.kontafy.desktop.components.KontafyTextField
import com.kontafy.desktop.db.repositories.UserRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun LoginScreen(
    authService: AuthService,
    userRepository: UserRepository,
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Row(
        modifier = Modifier.fillMaxSize(),
    ) {
        // Left panel - branding
        Box(
            modifier = Modifier
                .weight(0.45f)
                .fillMaxHeight()
                .background(KontafyColors.Navy),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(48.dp),
            ) {
                Surface(
                    modifier = Modifier.size(72.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = KontafyColors.Green,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            "K",
                            color = KontafyColors.White,
                            fontSize = 36.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                Spacer(Modifier.height(24.dp))

                Text(
                    "Kontafy",
                    style = MaterialTheme.typography.displayLarge,
                    color = KontafyColors.White,
                    fontWeight = FontWeight.Bold,
                )

                Spacer(Modifier.height(8.dp))

                Text(
                    "Modern Accounting Platform",
                    style = MaterialTheme.typography.bodyLarge,
                    color = KontafyColors.White.copy(alpha = 0.7f),
                )

                Spacer(Modifier.height(48.dp))

                Text(
                    "Manage invoices, track expenses, and\ngrow your business with confidence.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = KontafyColors.White.copy(alpha = 0.5f),
                    lineHeight = 24.sp,
                )
            }
        }

        // Right panel - login form
        Box(
            modifier = Modifier
                .weight(0.55f)
                .fillMaxHeight()
                .background(KontafyColors.Surface),
            contentAlignment = Alignment.Center,
        ) {
            Card(
                modifier = Modifier.widthIn(max = 420.dp).padding(48.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            ) {
                Column(
                    modifier = Modifier.padding(32.dp),
                ) {
                    Text(
                        "Welcome back",
                        style = MaterialTheme.typography.headlineLarge,
                        color = KontafyColors.Ink,
                    )

                    Spacer(Modifier.height(4.dp))

                    Text(
                        "Sign in to your Kontafy account",
                        style = MaterialTheme.typography.bodyLarge,
                        color = KontafyColors.Muted,
                    )

                    Spacer(Modifier.height(32.dp))

                    KontafyTextField(
                        value = email,
                        onValueChange = {
                            email = it
                            errorMessage = null
                        },
                        label = "Email",
                        placeholder = "you@company.com",
                        keyboardType = KeyboardType.Email,
                        isError = errorMessage != null,
                    )

                    Spacer(Modifier.height(16.dp))

                    KontafyTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            errorMessage = null
                        },
                        label = "Password",
                        placeholder = "Enter your password",
                        isPassword = true,
                        isError = errorMessage != null,
                        errorMessage = errorMessage,
                    )

                    Spacer(Modifier.height(24.dp))

                    KontafyButton(
                        text = "Sign In",
                        onClick = {
                            if (email.isBlank() || password.isBlank()) {
                                errorMessage = "Please enter both email and password"
                                return@KontafyButton
                            }
                            isLoading = true
                            errorMessage = null
                            scope.launch {
                                val user = withContext(Dispatchers.IO) {
                                    userRepository.authenticate(email.trim(), password)
                                }
                                isLoading = false
                                if (user != null) {
                                    val response = LoginResponse(
                                        accessToken = "local-${user.id}-${System.currentTimeMillis()}",
                                        user = UserDto(
                                            id = user.id.toString(),
                                            email = user.email,
                                            name = user.name,
                                            organizationId = user.organizationId,
                                        ),
                                    )
                                    authService.onLoginSuccess(response)
                                    onLoginSuccess()
                                } else {
                                    errorMessage = "Invalid email or password"
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        isLoading = isLoading,
                        variant = ButtonVariant.Primary,
                    )

                    Spacer(Modifier.height(16.dp))

                    TextButton(
                        onClick = onNavigateToRegister,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            "Don't have an account? Register",
                            color = KontafyColors.Green,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }
        }
    }
}
