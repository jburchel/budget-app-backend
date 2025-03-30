// DTO for updating user profile information
export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  // Add other updatable fields as needed, but not email or password here
}

// DTO for changing the user's password
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
