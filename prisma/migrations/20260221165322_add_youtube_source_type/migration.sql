-- AlterEnum
ALTER TYPE "SourceType" ADD VALUE 'YOUTUBE';

-- DropIndex
DROP INDEX "chunks_embedding_hnsw_idx";
