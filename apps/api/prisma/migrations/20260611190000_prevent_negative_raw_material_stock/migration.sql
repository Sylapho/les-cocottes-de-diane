DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "MatierePremiere"
        WHERE "stock" < 0
    ) THEN
        RAISE EXCEPTION 'Cannot add MatierePremiere stock >= 0 check: invalid existing raw material stock found';
    END IF;
END $$;

ALTER TABLE "MatierePremiere"
ADD CONSTRAINT "MatierePremiere_stock_non_negative_check"
CHECK ("stock" >= 0);
