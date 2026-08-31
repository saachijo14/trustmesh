import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")


_driver = None


def get_driver():
    """Return a singleton Neo4j driver instance."""
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
        )
    return _driver


def verify_connection():
    """Verify that the Neo4j server accepts the configured credentials."""
    driver = get_driver()

    try:
        driver.verify_connectivity()

        with driver.session() as session:
            result = session.run(
                "RETURN 'Connected to Neo4j!' AS message"
            )
            return result.single()["message"]

    except Exception as e:
        print(f"Neo4j connection failed: {type(e).__name__}")
        print(f"Details: {e}")
        return None


def close_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


if __name__ == "__main__":
    print(verify_connection())
    close_driver()