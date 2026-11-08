// F3: pys happy path — small fixture with truth (no third-party deps).
export const PYSHOP_FILES: Record<string, string> = {
  "main.py": "from shop import checkout\ncheckout()\n",
  "shop.py": "def checkout():\n    helper()\ndef helper():\n    pass\n",
};
export const PYSHOP_TRUTH = [["main.py::checkout().", "shop.py::checkout()."], ["shop.py::checkout().", "shop.py::helper()."]] as const;
