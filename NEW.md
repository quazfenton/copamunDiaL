

-- profile.tsx
The changes I need to make are:

Add useState for selectedImage.
Add the file input and label for image upload.
Update the AvatarImage src to use selectedImage if available.
Add handleImageChange and handleSaveChanges functions.
Correct the typo in displayPlayer.preferredPositions?.?.toLowerCase() to displayPlayer.preferredPositions?.[0]?.toLowerCase().
Update defaultValue for the primary and secondary 
