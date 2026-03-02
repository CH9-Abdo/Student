from student_app.database import init_db, sync_from_cloud, push_to_cloud, get_uid
import sys

def run_test():
    print("--- StudentPro Sync Diagnostic ---")
    
    # 1. Initialize DB
    print("[1/3] Initializing local database...")
    init_db()
    
    # 2. Check Auth
    uid = get_uid()
    if not uid:
        print("Error: No user session found. Please log in to the app first.")
        return
    
    print(f"Logged in as User ID: {uid}")
    
    # 3. Test Download (Pull)
    print("[2/3] Testing Cloud Download (Pull)...")
    if sync_from_cloud():
        print("✅ Download Sync Successful!")
    else:
        print("❌ Download Sync Failed!")
        
    # 4. Test Upload (Push)
    print("[3/3] Testing Cloud Upload (Push)...")
    if push_to_cloud():
        print("✅ Upload Sync Successful!")
    else:
        print("❌ Upload Sync Failed!")

if __name__ == "__main__":
    run_test()
