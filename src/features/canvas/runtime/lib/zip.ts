import { unzipSync, zipSync } from "fflate";

type ZipFile = {
    name: string;
    data: BlobPart;
};

export async function createZip(files: ZipFile[]) {
    const entries = await Promise.all(
        files.map(async (file) => {
            const data = new Uint8Array(await new Blob([file.data]).arrayBuffer());
            return [file.name, data] as const;
        }),
    );
    return new Blob([zipSync(Object.fromEntries(entries), { level: 0 })], { type: "application/zip" });
}

export async function readZip(file: Blob) {
    const maximumSize = 256 * 1024 * 1024;
    if (file.size > maximumSize) throw new Error("画布压缩包超过 256 MB");
    let expandedSize = 0;
    let count = 0;
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: ({ name, originalSize }) => {
            count += 1;
            expandedSize += originalSize;
            if (count > 2000 || expandedSize > maximumSize || (name === "projects.json" && originalSize > 8 * 1024 * 1024)) {
                throw new Error("画布压缩包内容超过导入上限");
            }
            return name === "projects.json" || name.startsWith("projects/");
        },
    });
    return new Map(Object.entries(entries).map(([name, data]) => [name, new Blob([data])]));
}
