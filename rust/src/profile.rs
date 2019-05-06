pub fn since(t: std::time::SystemTime) -> u128 {
    std::time::SystemTime::now()
        .duration_since(t)
        .unwrap()
        .as_millis()
}

macro_rules! profile {
    ( $message:expr, $x:expr ) => {{
        let start = std::time::SystemTime::now();
        let result = $x;
        println!(
            "{} took {}",
            $message,
            std::time::SystemTime::now()
                .duration_since(start)
                .unwrap()
                .as_millis()
        );
        result
    }};
}
