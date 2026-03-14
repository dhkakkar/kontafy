package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.kontafy.desktop.api.OrganizationModel
import com.kontafy.desktop.db.repositories.OrganizationRepository
import com.kontafy.desktop.db.repositories.UserModel
import com.kontafy.desktop.db.repositories.UserRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun RegisterScreen(
    authService: AuthService,
    userRepository: UserRepository,
    organizationRepository: OrganizationRepository,
    onRegistrationSuccess: () -> Unit,
    onNavigateToLogin: () -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var companyName by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var licenseKey by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Row(
        modifier = Modifier.fillMaxSize(),
    ) {
        // Left panel - branding
        Box(
            modifier = Modifier
                .weight(0.4f)
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

                // Feature highlights
                val features = listOf(
                    "GST-compliant invoicing & e-Way Bills",
                    "Complete double-entry accounting",
                    "Offline-first with cloud sync",
                    "Bank reconciliation & payments",
                    "Inventory & stock management",
                    "GSTR-1 & GSTR-3B filing",
                )
                features.forEach { feature ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("  \u2713  ", color = KontafyColors.Green, fontWeight = FontWeight.Bold)
                        Text(
                            feature,
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.White.copy(alpha = 0.8f),
                        )
                    }
                }
            }
        }

        // Right panel - registration form
        Box(
            modifier = Modifier
                .weight(0.6f)
                .fillMaxHeight()
                .background(KontafyColors.Surface),
            contentAlignment = Alignment.Center,
        ) {
            Card(
                modifier = Modifier.widthIn(max = 500.dp).padding(32.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            ) {
                Column(
                    modifier = Modifier
                        .padding(32.dp)
                        .verticalScroll(rememberScrollState()),
                ) {
                    Text(
                        "Create Account",
                        style = MaterialTheme.typography.headlineLarge,
                        color = KontafyColors.Ink,
                    )

                    Spacer(Modifier.height(4.dp))

                    Text(
                        "Set up your Kontafy account to get started",
                        style = MaterialTheme.typography.bodyLarge,
                        color = KontafyColors.Muted,
                    )

                    Spacer(Modifier.height(24.dp))

                    // Personal Info section
                    Text(
                        "Personal Information",
                        style = MaterialTheme.typography.titleSmall,
                        color = KontafyColors.Ink,
                        fontWeight = FontWeight.SemiBold,
                    )

                    Spacer(Modifier.height(12.dp))

                    KontafyTextField(
                        value = name,
                        onValueChange = { name = it; errorMessage = null },
                        label = "Full Name",
                        placeholder = "Enter your full name",
                    )

                    Spacer(Modifier.height(12.dp))

                    KontafyTextField(
                        value = email,
                        onValueChange = { email = it; errorMessage = null },
                        label = "Email",
                        placeholder = "you@company.com",
                        keyboardType = KeyboardType.Email,
                    )

                    Spacer(Modifier.height(12.dp))

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(modifier = Modifier.weight(1f)) {
                            KontafyTextField(
                                value = password,
                                onValueChange = { password = it; errorMessage = null },
                                label = "Password",
                                placeholder = "Min 6 characters",
                                isPassword = true,
                            )
                        }
                        Box(modifier = Modifier.weight(1f)) {
                            KontafyTextField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it; errorMessage = null },
                                label = "Confirm Password",
                                placeholder = "Re-enter password",
                                isPassword = true,
                            )
                        }
                    }

                    Spacer(Modifier.height(24.dp))

                    // Company Info section
                    Text(
                        "Company Information",
                        style = MaterialTheme.typography.titleSmall,
                        color = KontafyColors.Ink,
                        fontWeight = FontWeight.SemiBold,
                    )

                    Spacer(Modifier.height(12.dp))

                    KontafyTextField(
                        value = companyName,
                        onValueChange = { companyName = it },
                        label = "Company Name",
                        placeholder = "Your company name",
                    )

                    Spacer(Modifier.height(12.dp))

                    KontafyTextField(
                        value = gstin,
                        onValueChange = { gstin = it.uppercase().take(15) },
                        label = "GSTIN (Optional)",
                        placeholder = "e.g. 27AADCA1234F1ZK",
                    )

                    Spacer(Modifier.height(24.dp))

                    // License section
                    Text(
                        "License Key (Optional)",
                        style = MaterialTheme.typography.titleSmall,
                        color = KontafyColors.Ink,
                        fontWeight = FontWeight.SemiBold,
                    )

                    Spacer(Modifier.height(4.dp))

                    Text(
                        "Enter your license key to unlock premium features. Leave blank for Free plan.",
                        style = MaterialTheme.typography.bodySmall,
                        color = KontafyColors.Muted,
                    )

                    Spacer(Modifier.height(8.dp))

                    KontafyTextField(
                        value = licenseKey,
                        onValueChange = { licenseKey = it.uppercase() },
                        label = "License Key",
                        placeholder = "XXXX-XXXX-XXXX-XXXX",
                    )

                    if (errorMessage != null) {
                        Spacer(Modifier.height(12.dp))
                        Text(
                            errorMessage!!,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }

                    Spacer(Modifier.height(24.dp))

                    KontafyButton(
                        text = "Create Account",
                        onClick = {
                            // Validation
                            when {
                                name.isBlank() -> {
                                    errorMessage = "Name is required"
                                    return@KontafyButton
                                }
                                email.isBlank() || !email.contains("@") -> {
                                    errorMessage = "Valid email is required"
                                    return@KontafyButton
                                }
                                password.length < 6 -> {
                                    errorMessage = "Password must be at least 6 characters"
                                    return@KontafyButton
                                }
                                password != confirmPassword -> {
                                    errorMessage = "Passwords do not match"
                                    return@KontafyButton
                                }
                                companyName.isBlank() -> {
                                    errorMessage = "Company name is required"
                                    return@KontafyButton
                                }
                            }

                            isLoading = true
                            errorMessage = null
                            scope.launch {
                                try {
                                    val result = withContext(Dispatchers.IO) {
                                        // Check if email already exists
                                        val existing = userRepository.getByEmail(email.trim())
                                        if (existing != null) {
                                            return@withContext null to "Email already registered"
                                        }

                                        // Determine license type from key
                                        val licenseType = when {
                                            licenseKey.isBlank() -> "FREE"
                                            licenseKey.startsWith("KTF-STR") -> "STARTER"
                                            licenseKey.startsWith("KTF-PRO") -> "PROFESSIONAL"
                                            licenseKey.startsWith("KTF-ENT") -> "ENTERPRISE"
                                            else -> "FREE"
                                        }

                                        val orgId = "org-${System.currentTimeMillis()}"

                                        // Create the organization record first (FK target)
                                        organizationRepository.create(
                                            OrganizationModel(
                                                id = orgId,
                                                name = companyName.trim(),
                                                gstin = gstin.ifBlank { null },
                                                email = email.trim(),
                                            )
                                        )

                                        val user = userRepository.create(
                                            UserModel(
                                                name = name.trim(),
                                                email = email.trim(),
                                                passwordHash = UserRepository.hashPassword(password),
                                                role = "ADMIN",
                                                organizationId = orgId,
                                                licenseKey = licenseKey.ifBlank { null },
                                                licenseType = licenseType,
                                            )
                                        )
                                        user to null
                                    }

                                    isLoading = false
                                    val (user, error) = result
                                    if (error != null) {
                                        errorMessage = error
                                    } else if (user != null) {
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
                                        // Set the org name from the company name collected during registration
                                        user.organizationId?.let { orgId ->
                                            authService.switchOrganization(orgId, companyName.trim())
                                        }
                                        onRegistrationSuccess()
                                    }
                                } catch (e: Exception) {
                                    isLoading = false
                                    errorMessage = e.message ?: "Registration failed"
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        isLoading = isLoading,
                        variant = ButtonVariant.Primary,
                    )

                    Spacer(Modifier.height(12.dp))

                    TextButton(
                        onClick = onNavigateToLogin,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            "Already have an account? Sign in",
                            color = KontafyColors.Green,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }
            }
        }
    }
}
