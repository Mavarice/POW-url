-- ----------------------------------------------------------------------------

-- table: banneddomain
CREATE TABLE banneddomain (
    id              INTEGER NOT NULL DEFAULT nextval('object_id_seq'::TEXT) PRIMARY KEY,
    domain          TEXT NOT NULL,

    LIKE base       INCLUDING DEFAULTS
);

CREATE TRIGGER banneddomain_update BEFORE UPDATE ON banneddomain
    FOR EACH ROW EXECUTE PROCEDURE updated();

-- ----------------------------------------------------------------------------
