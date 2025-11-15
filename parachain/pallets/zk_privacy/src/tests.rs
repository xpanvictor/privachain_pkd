use crate::mock::new_test_ext;

#[test]
fn it_shields() {
    new_test_ext().execute_with(|| {
        assert_eq!(1, 1);
    })
}
