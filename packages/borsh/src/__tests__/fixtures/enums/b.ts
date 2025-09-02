import { deserialize, serialize, variant } from "../../../index.js";
import { Base } from "./base.js";

@variant("B")
class B extends Base { }

deserialize(serialize(new B()), Base)