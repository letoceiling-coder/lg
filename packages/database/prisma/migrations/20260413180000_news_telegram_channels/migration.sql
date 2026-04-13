-- Каналы Telegram для парсера новостей (настройки в админке)
CREATE TABLE "news_telegram_channels" (
    "id" SERIAL NOT NULL,
    "channel_ref" VARCHAR(255) NOT NULL,
    "label" VARCHAR(255),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "limit_per_run" INTEGER NOT NULL DEFAULT 20,
    "publish_on_import" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_telegram_channels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "news_telegram_channels_channel_ref_key" ON "news_telegram_channels"("channel_ref");
