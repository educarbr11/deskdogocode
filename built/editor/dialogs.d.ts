export declare function cantImportAsync(project: pxt.editor.IProjectView): Promise<void>;
export declare function showProgramTooLargeErrorAsync(variants: string[], confirmAsync: (opts: any) => Promise<number>, saveOnly?: boolean): Promise<{
    recompile: boolean;
    useVariants: string[];
}>;
