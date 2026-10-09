import sqlite3
conn = sqlite3.connect("learngraph.db")
cursor = conn.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE name='concept_prerequisites'")
print("Schema:", cursor.fetchone()[0])
cursor.execute("SELECT count(id) FROM concept_prerequisites")
print("Total rows:", cursor.fetchone()[0])
cursor.execute("SELECT * FROM concept_prerequisites")
rows = cursor.fetchall()
print(f"Loaded {len(rows)} rows")
for r in rows[:5]:
    print(r)
conn.close()
