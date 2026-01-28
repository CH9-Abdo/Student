import sys
import os

# Add the current directory to sys.path to ensure imports work. now is this work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from student_app.main import main

if __name__ == "__main__":
    main()
