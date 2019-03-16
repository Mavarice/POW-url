-- ----------------------------------------------------------------------------

-- table: url
CREATE TABLE url (
    id              INTEGER NOT NULL DEFAULT nextval('object_id_seq'::TEXT) PRIMARY KEY,
    code            TEXT NOT NULL UNIQUE,
    url             TEXT NOT NULL,

    LIKE base       INCLUDING DEFAULTS
);

CREATE TRIGGER url_update BEFORE UPDATE ON url
    FOR EACH ROW EXECUTE PROCEDURE updated();

-- ----------------------------------------------------------------------------
