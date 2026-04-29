-- CreateTable
CREATE TABLE  telegram_auth_codes (
    id SERIAL NOT NULL,
    user_id UUID NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP(3) NOT NULL,
    used_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,

    CONSTRAINT telegram_auth_codes_pkey PRIMARY KEY (id)
);

-- CreateIndex
CREATE INDEX telegram_auth_codes_user_id_idx ON telegram_auth_codes(user_id);

-- CreateIndex
CREATE INDEX telegram_auth_codes_code_idx ON telegram_auth_codes(code);

-- CreateIndex
CREATE INDEX telegram_auth_codes_expires_at_idx ON telegram_auth_codes(expires_at);

-- CreateIndex
CREATE INDEX telegram_auth_codes_used_at_idx ON telegram_auth_codes(used_at);

-- AddForeignKey
ALTER TABLE telegram_auth_codes ADD CONSTRAINT telegram_auth_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
