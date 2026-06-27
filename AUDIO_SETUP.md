# Adding the Mataf Audio

The simulator can play background audio during the Tawaf (Mataf) area.

## How to add the audio

1. Get the audio you want as an MP3 file. From a YouTube link you can use any
   YouTube-to-MP3 converter website, or download via a tool you have, then
   convert to `.mp3`.
   (Reference you provided: https://youtu.be/dFEcXxb5bWM )

2. Rename the file to exactly:  **mataf.mp3**

3. Place it in the project's **public** folder:
   ```
   virtual-umrah/public/mataf.mp3
   ```

4. Run the app. When you reach the Tawaf area, a **🔈 Play Mataf audio**
   button appears at the bottom-left. Click it to play (browsers require a
   click before audio can start). It loops while you are in the Mataf area and
   stops automatically when you move to Sa'i.

## Note
If `public/mataf.mp3` is not present, the button still appears but does
nothing — the app will not break. Add the file whenever you are ready.

## Copyright reminder
Use audio you have the right to use (e.g. your own recording, royalty-free
Quranic recitation, or audio you are permitted to use for an academic project).
