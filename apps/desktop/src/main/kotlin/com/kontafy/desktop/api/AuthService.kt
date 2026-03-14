package com.kontafy.desktop.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import java.util.prefs.Preferences

class AuthService {
    private val prefs = Preferences.userNodeForPackage(AuthService::class.java)

    var currentUser by mutableStateOf<UserDto?>(null)
        private set

    var isAuthenticated by mutableStateOf(false)
        private set

    var token: String? = null
        private set

    var currentOrgId by mutableStateOf<String?>(null)
        private set

    var currentOrgName by mutableStateOf<String?>(null)
        private set

    init {
        // Restore persisted token on startup
        val savedToken = prefs.get(KEY_TOKEN, null)
        if (savedToken != null) {
            token = savedToken
            isAuthenticated = true
            val userName = prefs.get(KEY_USER_NAME, "")
            val userEmail = prefs.get(KEY_USER_EMAIL, "")
            val userId = prefs.get(KEY_USER_ID, "")
            val orgId = prefs.get(KEY_ORG_ID, null)
            currentUser = UserDto(
                id = userId,
                email = userEmail,
                name = userName,
                organizationId = orgId,
            )
            // Restore current org selection
            currentOrgId = prefs.get(KEY_CURRENT_ORG_ID, null) ?: orgId
            currentOrgName = prefs.get(KEY_CURRENT_ORG_NAME, null)
        }
    }

    fun onLoginSuccess(response: LoginResponse) {
        token = response.accessToken
        currentUser = response.user
        isAuthenticated = true

        prefs.put(KEY_TOKEN, response.accessToken)
        prefs.put(KEY_USER_ID, response.user.id)
        prefs.put(KEY_USER_EMAIL, response.user.email)
        prefs.put(KEY_USER_NAME, response.user.name)
        response.user.organizationId?.let { prefs.put(KEY_ORG_ID, it) }

        // Set current org from the user's organizationId on login
        val orgId = response.user.organizationId
        if (orgId != null) {
            currentOrgId = orgId
            prefs.put(KEY_CURRENT_ORG_ID, orgId)
            // currentOrgName will be set separately if needed (e.g. from registration or org lookup)
        }
    }

    fun switchOrganization(orgId: String, orgName: String) {
        currentOrgId = orgId
        currentOrgName = orgName
        prefs.put(KEY_CURRENT_ORG_ID, orgId)
        prefs.put(KEY_CURRENT_ORG_NAME, orgName)
    }

    fun logout() {
        token = null
        currentUser = null
        isAuthenticated = false
        currentOrgId = null
        currentOrgName = null

        prefs.remove(KEY_TOKEN)
        prefs.remove(KEY_USER_ID)
        prefs.remove(KEY_USER_EMAIL)
        prefs.remove(KEY_USER_NAME)
        prefs.remove(KEY_ORG_ID)
        prefs.remove(KEY_CURRENT_ORG_ID)
        prefs.remove(KEY_CURRENT_ORG_NAME)
    }

    companion object {
        private const val KEY_TOKEN = "kontafy_auth_token"
        private const val KEY_USER_ID = "kontafy_user_id"
        private const val KEY_USER_EMAIL = "kontafy_user_email"
        private const val KEY_USER_NAME = "kontafy_user_name"
        private const val KEY_ORG_ID = "kontafy_org_id"
        private const val KEY_CURRENT_ORG_ID = "current_org_id"
        private const val KEY_CURRENT_ORG_NAME = "current_org_name"
    }
}
