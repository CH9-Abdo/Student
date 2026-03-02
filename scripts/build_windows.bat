@echo off
echo Building StudentPro for Windows...
pyinstaller --noconfirm --onefile --windowed ^
--icon "student_app/assets/130manstudent2_100617.ico" ^
--add-data "student_app/assets;student_app/assets" ^
--add-data "templates.txt;." ^
--name "StudentPro" ^
run.py
echo Done! Check the 'dist' folder.
pause
