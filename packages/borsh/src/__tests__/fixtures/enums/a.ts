import { deserialize, serialize, variant } from "../../../index.js";
import { Base } from "./base.js";


@variant("A")
class A extends Base { }

deserialize(serialize(new A()), Base)