import glob
from database import SessionLocal
from import_data import (
    import_candidates_from_file,
    import_credentials_from_file,
    import_jobs_from_file,
    import_assignments_from_file,
    import_expenses_from_file,
    import_documents_from_file
)
import traceback

print("\n=== TRAVEL ATS - FULL DATA IMPORT ===\n")

db = SessionLocal()

stats = {
    "candidates":   {"imported":0, "skipped":0},
    "credentials":  {"imported":0, "skipped":0},
    "jobs":         {"imported":0, "skipped":0},
    "assignments":  {"imported":0, "skipped":0},
    "expenses":     {"imported":0, "skipped":0},
    "documents":    {"imported":0, "skipped":0},
}

order = [
    ("candidates",   import_candidates_from_file,   "ats_candidates*.csv"),
    ("credentials",  import_credentials_from_file,  "credentials.csv"),
    ("jobs",         import_jobs_from_file,         "jobs.csv"),
    ("assignments",  import_assignments_from_file,  "assignments.csv"),
    ("expenses",     import_expenses_from_file,     "expenses.csv"),
    ("documents",    import_documents_from_file,    "documents*.csv"),
]

for name, func, pattern in order:
    print(f"\n━━━━━━━━━━ {name.upper()} ━━━━━━━━━━")
    files = sorted(glob.glob(pattern))

    if not files:
        print("No matching files found")
        continue

    for fpath in files:
        print(f"\n→ {fpath}")
        try:
            result = func(fpath, db)
            stats[name]["imported"] += result["imported"]
            stats[name]["skipped"]  += result["skipped"]

            print(f"   Imported : {result['imported']}")
            print(f"   Skipped  : {result['skipped']}")
            if result.get("errors"):
                print(f"   Errors   : {len(result['errors'])}")
                for e in result["errors"]:
                    print(f"     {e}")

            db.commit()
            print("   → committed")

        except Exception as exc:
            db.rollback()
            print(f"   FAILED: {exc}")
            traceback.print_exc()

db.close()

print("\n" + "═"*60)
print("           IMPORT SUMMARY")
print("═"*60)
for k, v in stats.items():
    print(f"{k:12} | imported: {v['imported']:>5}   skipped: {v['skipped']:>5}")
print("═"*60)
print("Done.\n")
