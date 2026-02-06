from database import engine
from models import Base

print("Creating all tables if they do not exist...")

try:
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully (or already exist).")
except Exception as e:
    print("Error while creating tables:")
    import traceback
    traceback.print_exc()