/* eslint @jespers/css-modules/no-unused-classes: [2, { markAsUsed: ['baz', 'biz', 'block', 'flex'] }] */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import styles from "./foo.module.css";

console.log(styles.bar);
