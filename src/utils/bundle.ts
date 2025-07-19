export const loadBundleFromUrl = async (bundleUrl: string): Promise<any> => {
    try {
      const bundleName = bundleUrl.split('/').pop()?.split('.')[0] || '';
      if (!bundleName || bundleName === '') {
        return {};
      }
      const { bundle } = await import('../bundles');
      const bundleCode = await bundle(bundleName);
  
      return bundleCode.default;
    } catch (error) {
      console.error('[loadBundleFromUrl] Error:', error);
      return {};
    }
  };
  