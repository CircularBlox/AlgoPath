// "prismjs" must be the first side-effect: it sets self.Prism globally,
// which the component files below rely on.
import "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import Prism from "prismjs";

export const { highlight, languages } = Prism;
